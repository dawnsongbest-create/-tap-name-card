import { describe, expect, it } from 'vitest';

import { AuthService } from '../../cloudfunctions/shared/auth/auth-service';
import {
  createAccountAcceptPoliciesHandler,
  createAccountGetMeHandler,
  createAuthEnsureUserHandler,
} from '../../cloudfunctions/shared/auth/handlers';
import { deriveIdentityKey } from '../../cloudfunctions/shared/auth/identity-key';
import { StaticTrustedIdentityProvider } from '../../cloudfunctions/shared/auth/trusted-identity-provider';
import { InMemoryUserRepository } from '../../cloudfunctions/shared/db/in-memory-user-repository';
import { TransactionConflictError } from '../../cloudfunctions/shared/db/user-repository';
import type { CloudFunctionResult } from '../../shared/types/cloud-function';

const TEST_SECRET = 'synthetic-local-secret-never-used-outside-tests';
const CURRENT_POLICIES = {
  terms: 'terms-2026-07',
  privacy: 'privacy-2026-07',
};
const FIXED_TIME = new Date('2026-07-25T08:00:00.000Z');

interface TestContext {
  repository: InMemoryUserRepository;
  service: AuthService;
  identityKey: string;
  delays: number[];
}

function createContext(openId: string | undefined = 'synthetic-open-id'): TestContext {
  const repository = new InMemoryUserRepository();
  const delays: number[] = [];
  let nextUserId = 1;

  return {
    repository,
    identityKey: openId ? deriveIdentityKey(openId, TEST_SECRET) : '',
    delays,
    service: new AuthService({
      identityProvider: new StaticTrustedIdentityProvider(openId),
      repository,
      identityHmacSecret: TEST_SECRET,
      currentPolicyVersions: CURRENT_POLICIES,
      createUserId: () => `user-${nextUserId++}`,
      now: () => new Date(FIXED_TIME),
      delay: (milliseconds) => {
        delays.push(milliseconds);
        return Promise.resolve();
      },
    }),
  };
}

function successData<T>(result: CloudFunctionResult<T>): T {
  expect(result.success).toBe(true);
  expect(result.error).toBeUndefined();

  if (!result.success || result.data === undefined) {
    throw new Error('Expected a successful cloud function result.');
  }

  return result.data;
}

function expectError<T>(result: CloudFunctionResult<T>, code: string): void {
  expect(result.success).toBe(false);
  expect(result.data).toBeUndefined();
  expect(result.error?.code).toBe(code);
}

describe('M1.2-A identity handlers', () => {
  it('creates one user and one minimal mapping without exposing OpenID', async () => {
    const context = createContext();
    const result = await createAuthEnsureUserHandler(context.service)({}, 'req-create');
    const view = successData(result);

    expect(view).toMatchObject({
      userId: 'user-1',
      status: 'ACTIVE',
      needsPolicyAcceptance: true,
    });
    expect(Object.keys(view)).toEqual(['userId', 'status', 'needsPolicyAcceptance', 'createdAt']);
    expect(JSON.stringify(result)).not.toContain('synthetic-open-id');
    expect(context.repository.getCounts()).toEqual({ users: 1, mappings: 1 });
    expect(
      Object.keys(context.repository.getMappingSnapshotForTest(context.identityKey) ?? {}),
    ).toEqual(['userId', 'provider', 'createdAt']);
  });

  it('rejects forged identity input and missing trusted identity', async () => {
    const forgedContext = createContext();
    const forgedResult = await createAuthEnsureUserHandler(forgedContext.service)(
      { openId: 'forged-client-value' },
      'req-forged',
    );
    const missingContext = createContext('');
    const missingResult = await createAuthEnsureUserHandler(missingContext.service)(
      {},
      'req-missing',
    );

    expectError(forgedResult, 'INVALID_INPUT');
    expectError(missingResult, 'AUTH_REQUIRED');
  });

  it('returns USER_NOT_FOUND from getMe before identity creation', async () => {
    const context = createContext();
    const result = await createAccountGetMeHandler(context.service)({}, 'req-get-missing');

    expectError(result, 'USER_NOT_FOUND');
    expect(context.repository.getCounts()).toEqual({ users: 0, mappings: 0 });
  });

  it('prevents duplicate users during concurrent first creation', async () => {
    const context = createContext();
    const handler = createAuthEnsureUserHandler(context.service);
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, index) => handler({}, `req-concurrent-${index}`)),
    );
    const userIds = results.map((result) => successData(result).userId);

    expect(new Set(userIds)).toEqual(new Set(['user-1']));
    expect(context.repository.getCounts()).toEqual({ users: 1, mappings: 1 });
  });

  it('does not overwrite an existing user when an internal userId collides', async () => {
    const repository = new InMemoryUserRepository();
    const createdAt = new Date(FIXED_TIME);

    await repository.createIdentityAtomically({
      identityKey: 'identity-key-a',
      user: {
        _id: 'colliding-user-id',
        openId: 'synthetic-open-id-a',
        status: 'ACTIVE',
        createdAt,
        updatedAt: createdAt,
      },
      mapping: {
        userId: 'colliding-user-id',
        provider: 'WECHAT_MINIPROGRAM',
        createdAt,
      },
    });

    await expect(
      repository.createIdentityAtomically({
        identityKey: 'identity-key-b',
        user: {
          _id: 'colliding-user-id',
          openId: 'synthetic-open-id-b',
          status: 'ACTIVE',
          createdAt,
          updatedAt: createdAt,
        },
        mapping: {
          userId: 'colliding-user-id',
          provider: 'WECHAT_MINIPROGRAM',
          createdAt,
        },
      }),
    ).rejects.toBeInstanceOf(TransactionConflictError);

    expect((await repository.findByIdentityKey('identity-key-a'))?.openId).toBe(
      'synthetic-open-id-a',
    );
    expect(await repository.findByIdentityKey('identity-key-b')).toBeUndefined();
    expect(repository.getCounts()).toEqual({ users: 1, mappings: 1 });
  });

  it('uses bounded transaction backoff and succeeds before the third attempt', async () => {
    const context = createContext();
    context.repository.forceTransactionConflicts(2);

    const result = await createAuthEnsureUserHandler(context.service)({}, 'req-retry-success');

    expect(successData(result).userId).toBe('user-3');
    expect(context.delays).toEqual([10, 20]);
    expect(context.repository.getCounts()).toEqual({ users: 1, mappings: 1 });
  });

  it('returns SERVICE_UNAVAILABLE after three transaction conflicts', async () => {
    const context = createContext();
    context.repository.forceTransactionConflicts(3);

    const result = await createAuthEnsureUserHandler(context.service)({}, 'req-retry-exhausted');

    expectError(result, 'SERVICE_UNAVAILABLE');
    expect(context.delays).toEqual([10, 20]);
    expect(context.repository.getCounts()).toEqual({ users: 0, mappings: 0 });
  });

  it('accepts terms and privacy atomically and treats the same versions as idempotent', async () => {
    const context = createContext();
    await context.service.ensureUser();
    const handler = createAccountAcceptPoliciesHandler(context.service);
    const firstResult = await handler(
      {
        acceptedTermsVersion: CURRENT_POLICIES.terms,
        acceptedPrivacyVersion: CURRENT_POLICIES.privacy,
      },
      'req-policy-first',
    );
    const firstData = successData(firstResult);
    const firstSnapshot = await context.repository.getPolicySnapshot(context.identityKey);
    const secondResult = await handler(
      {
        acceptedTermsVersion: CURRENT_POLICIES.terms,
        acceptedPrivacyVersion: CURRENT_POLICIES.privacy,
      },
      'req-policy-replay',
    );
    const secondData = successData(secondResult);
    const secondSnapshot = await context.repository.getPolicySnapshot(context.identityKey);

    expect(firstData.replayed).toBe(false);
    expect(firstData.user.needsPolicyAcceptance).toBe(false);
    expect(firstSnapshot?.termsAcceptedAt).toEqual(FIXED_TIME);
    expect(firstSnapshot?.privacyAcceptedAt).toEqual(FIXED_TIME);
    expect(secondData.replayed).toBe(true);
    expect(secondSnapshot).toEqual(firstSnapshot);
  });

  it('rejects unsupported or partial policy versions without changing stored acceptance', async () => {
    const context = createContext();
    await context.service.ensureUser();
    const handler = createAccountAcceptPoliciesHandler(context.service);
    const unsupportedResult = await handler(
      {
        acceptedTermsVersion: 'old-terms',
        acceptedPrivacyVersion: CURRENT_POLICIES.privacy,
      },
      'req-policy-old',
    );
    const partialResult = await handler(
      { acceptedTermsVersion: CURRENT_POLICIES.terms },
      'req-policy-partial',
    );

    expectError(unsupportedResult, 'POLICY_VERSION_UNSUPPORTED');
    expectError(partialResult, 'INVALID_INPUT');
    expect(await context.repository.getPolicySnapshot(context.identityKey)).toEqual({
      acceptedTermsVersion: undefined,
      acceptedPrivacyVersion: undefined,
      termsAcceptedAt: undefined,
      privacyAcceptedAt: undefined,
    });
  });

  it('allows RESTRICTED users to accept policies without lifting the restriction', async () => {
    const context = createContext();
    await context.service.ensureUser();
    await context.repository.setStatus(context.identityKey, 'RESTRICTED');
    const result = await createAccountAcceptPoliciesHandler(context.service)(
      {
        acceptedTermsVersion: CURRENT_POLICIES.terms,
        acceptedPrivacyVersion: CURRENT_POLICIES.privacy,
      },
      'req-restricted-policy',
    );

    expect(successData(result).user.status).toBe('RESTRICTED');
    expect((await context.service.getMe()).status).toBe('RESTRICTED');
    expect((await context.service.ensureUser()).status).toBe('RESTRICTED');
  });

  it('returns ACCOUNT_DELETED and never silently registers the identity again', async () => {
    const context = createContext();
    await context.service.ensureUser();
    await context.repository.setStatus(context.identityKey, 'DELETED');
    const ensureResult = await createAuthEnsureUserHandler(context.service)(
      {},
      'req-deleted-ensure',
    );
    const getResult = await createAccountGetMeHandler(context.service)({}, 'req-deleted-get');
    const policyResult = await createAccountAcceptPoliciesHandler(context.service)(
      {
        acceptedTermsVersion: CURRENT_POLICIES.terms,
        acceptedPrivacyVersion: CURRENT_POLICIES.privacy,
      },
      'req-deleted-policy',
    );

    expectError(ensureResult, 'ACCOUNT_DELETED');
    expectError(getResult, 'ACCOUNT_DELETED');
    expectError(policyResult, 'ACCOUNT_DELETED');
    expect(context.repository.getCounts()).toEqual({ users: 1, mappings: 1 });
  });

  it('returns SERVICE_UNAVAILABLE for a dangling identity mapping', async () => {
    const context = createContext();
    await context.service.ensureUser();
    await context.repository.deleteMappedUserForTest(context.identityKey);

    const result = await createAccountGetMeHandler(context.service)({}, 'req-dangling');

    expectError(result, 'SERVICE_UNAVAILABLE');
  });
});
