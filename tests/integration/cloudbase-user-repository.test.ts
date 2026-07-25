import { describe, expect, it } from 'vitest';

import { AuthService } from '../../cloudfunctions/shared/auth/auth-service';
import { StaticTrustedIdentityProvider } from '../../cloudfunctions/shared/auth/trusted-identity-provider';
import { deriveIdentityKey } from '../../cloudfunctions/shared/auth/identity-key';
import {
  CLOUDBASE_TRANSACTION_CONFLICT_CODE,
  CloudBaseUserRepository,
} from '../../cloudfunctions/shared/db/cloudbase-user-repository';
import {
  RepositoryConsistencyError,
  TransactionConflictError,
} from '../../cloudfunctions/shared/db/user-repository';
import { FakeCloudBaseDatabase } from '../helpers/fake-cloudbase-database';

const TEST_SECRET = 'synthetic-cloudbase-repository-secret';
const TEST_OPEN_ID = 'synthetic-cloudbase-open-id';
const TEST_IDENTITY_KEY = deriveIdentityKey(TEST_OPEN_ID, TEST_SECRET);
const FIXED_TIME = new Date('2026-07-25T10:00:00.000Z');

function createService(database: FakeCloudBaseDatabase): {
  service: AuthService;
  delays: number[];
} {
  const delays: number[] = [];
  let nextUserId = 1;

  return {
    delays,
    service: new AuthService({
      identityProvider: new StaticTrustedIdentityProvider(TEST_OPEN_ID),
      repository: new CloudBaseUserRepository(database),
      identityHmacSecret: TEST_SECRET,
      currentPolicyVersions: {
        terms: '1.0.0',
        privacy: '1.0.0',
      },
      createUserId: () => `user-${nextUserId++}`,
      now: () => new Date(FIXED_TIME),
      delay: (milliseconds) => {
        delays.push(milliseconds);
        return Promise.resolve();
      },
    }),
  };
}

describe('CloudBase UserRepository contract', () => {
  it('creates user and minimal identity mapping in one transaction', async () => {
    const database = new FakeCloudBaseDatabase();
    const repository = new CloudBaseUserRepository(database);
    const user = {
      _id: 'user-1',
      openId: TEST_OPEN_ID,
      status: 'ACTIVE' as const,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    };

    const created = await repository.createIdentityAtomically({
      identityKey: TEST_IDENTITY_KEY,
      user,
      mapping: {
        userId: user._id,
        provider: 'WECHAT_MINIPROGRAM',
        createdAt: FIXED_TIME,
      },
    });

    expect(created).toEqual(user);
    expect(database.transactionCalls).toBe(1);
    expect(database.transactionRetryArguments).toEqual([0]);
    expect(database.getCollectionSize('users')).toBe(1);
    expect(database.getCollectionSize('identity_mappings')).toBe(1);
    expect(database.getDocument('identity_mappings', TEST_IDENTITY_KEY)).toEqual({
      userId: 'user-1',
      provider: 'WECHAT_MINIPROGRAM',
      createdAt: FIXED_TIME,
    });
    expect(
      JSON.stringify(database.getDocument('identity_mappings', TEST_IDENTITY_KEY)),
    ).not.toContain(TEST_OPEN_ID);
    expect((await repository.findByIdentityKey(TEST_IDENTITY_KEY))?.openId).toBe(TEST_OPEN_ID);
  });

  it('returns the transaction winner instead of creating a duplicate mapping', async () => {
    const database = new FakeCloudBaseDatabase();
    const repository = new CloudBaseUserRepository(database);
    const firstUser = {
      _id: 'user-winner',
      openId: TEST_OPEN_ID,
      status: 'ACTIVE' as const,
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    };

    await repository.createIdentityAtomically({
      identityKey: TEST_IDENTITY_KEY,
      user: firstUser,
      mapping: {
        userId: firstUser._id,
        provider: 'WECHAT_MINIPROGRAM',
        createdAt: FIXED_TIME,
      },
    });
    const replayed = await repository.createIdentityAtomically({
      identityKey: TEST_IDENTITY_KEY,
      user: {
        ...firstUser,
        _id: 'user-loser',
      },
      mapping: {
        userId: 'user-loser',
        provider: 'WECHAT_MINIPROGRAM',
        createdAt: FIXED_TIME,
      },
    });

    expect(replayed._id).toBe('user-winner');
    expect(database.getCollectionSize('users')).toBe(1);
    expect(database.getCollectionSize('identity_mappings')).toBe(1);
  });

  it('fails safely when a mapping points to a missing user', async () => {
    const database = new FakeCloudBaseDatabase();
    database.seed('identity_mappings', TEST_IDENTITY_KEY, {
      userId: 'missing-user',
      provider: 'WECHAT_MINIPROGRAM',
      createdAt: FIXED_TIME,
    });
    const repository = new CloudBaseUserRepository(database);

    await expect(repository.findByIdentityKey(TEST_IDENTITY_KEY)).rejects.toBeInstanceOf(
      RepositoryConsistencyError,
    );
    expect(database.getCollectionSize('users')).toBe(0);
    expect(database.getCollectionSize('identity_mappings')).toBe(1);
  });

  it('does not overwrite a colliding userId or create a mapping', async () => {
    const database = new FakeCloudBaseDatabase();
    database.seed('users', 'user-collision', {
      openId: 'unrelated-synthetic-open-id',
      status: 'ACTIVE',
      createdAt: FIXED_TIME,
      updatedAt: FIXED_TIME,
    });
    const repository = new CloudBaseUserRepository(database);

    await expect(
      repository.createIdentityAtomically({
        identityKey: TEST_IDENTITY_KEY,
        user: {
          _id: 'user-collision',
          openId: TEST_OPEN_ID,
          status: 'ACTIVE',
          createdAt: FIXED_TIME,
          updatedAt: FIXED_TIME,
        },
        mapping: {
          userId: 'user-collision',
          provider: 'WECHAT_MINIPROGRAM',
          createdAt: FIXED_TIME,
        },
      }),
    ).rejects.toBeInstanceOf(TransactionConflictError);

    expect(database.getDocument('users', 'user-collision')?.openId).toBe(
      'unrelated-synthetic-open-id',
    );
    expect(database.getCollectionSize('identity_mappings')).toBe(0);
  });

  it('rolls back the user write when the mapping write fails', async () => {
    const database = new FakeCloudBaseDatabase();
    const repository = new CloudBaseUserRepository(database);
    const mappingFailure = new Error('synthetic mapping write failure');
    database.queueDocumentError('set', 'identity_mappings', TEST_IDENTITY_KEY, mappingFailure);

    await expect(
      repository.createIdentityAtomically({
        identityKey: TEST_IDENTITY_KEY,
        user: {
          _id: 'user-partial',
          openId: TEST_OPEN_ID,
          status: 'ACTIVE',
          createdAt: FIXED_TIME,
          updatedAt: FIXED_TIME,
        },
        mapping: {
          userId: 'user-partial',
          provider: 'WECHAT_MINIPROGRAM',
          createdAt: FIXED_TIME,
        },
      }),
    ).rejects.toBe(mappingFailure);

    expect(database.getCollectionSize('users')).toBe(0);
    expect(database.getCollectionSize('identity_mappings')).toBe(0);
  });

  it('maps only the documented transaction conflict code', async () => {
    const database = new FakeCloudBaseDatabase();
    const repository = new CloudBaseUserRepository(database);
    const input = {
      identityKey: TEST_IDENTITY_KEY,
      user: {
        _id: 'user-1',
        openId: TEST_OPEN_ID,
        status: 'ACTIVE' as const,
        createdAt: FIXED_TIME,
        updatedAt: FIXED_TIME,
      },
      mapping: {
        userId: 'user-1',
        provider: 'WECHAT_MINIPROGRAM' as const,
        createdAt: FIXED_TIME,
      },
    };

    database.queueTransactionErrors({
      code: CLOUDBASE_TRANSACTION_CONFLICT_CODE,
      message: 'synthetic conflict',
    });
    await expect(repository.createIdentityAtomically(input)).rejects.toBeInstanceOf(
      TransactionConflictError,
    );

    const nonConflict = {
      code: 'DATABASE_REQUEST_FAILED',
      message: 'synthetic non-conflict',
    };
    database.queueTransactionErrors(nonConflict);
    await expect(repository.createIdentityAtomically(input)).rejects.toBe(nonConflict);
    expect(database.transactionCalls).toBe(2);
  });

  it('uses exactly three service attempts for explicit conflicts and then fails safely', async () => {
    const database = new FakeCloudBaseDatabase();
    database.queueTransactionErrors(
      { code: CLOUDBASE_TRANSACTION_CONFLICT_CODE },
      { code: CLOUDBASE_TRANSACTION_CONFLICT_CODE },
      { code: CLOUDBASE_TRANSACTION_CONFLICT_CODE },
    );
    const context = createService(database);

    await expect(context.service.ensureUser()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
    expect(database.transactionCalls).toBe(3);
    expect(database.transactionRetryArguments).toEqual([0, 0, 0]);
    expect(context.delays).toEqual([10, 20]);
    expect(database.getCollectionSize('users')).toBe(0);
    expect(database.getCollectionSize('identity_mappings')).toBe(0);
  });

  it('does not retry a non-conflict database failure', async () => {
    const database = new FakeCloudBaseDatabase();
    database.queueTransactionErrors({
      code: 'DATABASE_REQUEST_FAILED',
      message: 'synthetic database failure',
    });
    const context = createService(database);

    await expect(context.service.ensureUser()).rejects.toMatchObject({
      code: 'SERVICE_UNAVAILABLE',
    });
    expect(database.transactionCalls).toBe(1);
    expect(context.delays).toEqual([]);
  });

  it('updates both policy versions atomically and replays the same versions', async () => {
    const database = new FakeCloudBaseDatabase();
    const context = createService(database);
    const created = await context.service.ensureUser();
    const first = await context.service.acceptPolicies({
      acceptedTermsVersion: '1.0.0',
      acceptedPrivacyVersion: '1.0.0',
    });
    const transactionCountAfterFirst = database.transactionCalls;
    const replay = await context.service.acceptPolicies({
      acceptedTermsVersion: '1.0.0',
      acceptedPrivacyVersion: '1.0.0',
    });

    expect(first.replayed).toBe(false);
    expect(replay.replayed).toBe(true);
    expect(replay.user.userId).toBe(created.userId);
    expect(database.transactionCalls).toBe(transactionCountAfterFirst + 1);
    expect(database.getDocument('users', created.userId)).toMatchObject({
      acceptedTermsVersion: '1.0.0',
      acceptedPrivacyVersion: '1.0.0',
      termsAcceptedAt: FIXED_TIME,
      privacyAcceptedAt: FIXED_TIME,
    });
  });

  it('retries explicit policy transaction conflicts with the same acceptance time', async () => {
    const database = new FakeCloudBaseDatabase();
    const context = createService(database);
    const created = await context.service.ensureUser();
    database.queueTransactionErrors(
      { code: CLOUDBASE_TRANSACTION_CONFLICT_CODE },
      { code: CLOUDBASE_TRANSACTION_CONFLICT_CODE },
    );

    const result = await context.service.acceptPolicies({
      acceptedTermsVersion: '1.0.0',
      acceptedPrivacyVersion: '1.0.0',
    });

    expect(result.replayed).toBe(false);
    expect(context.delays).toEqual([10, 20]);
    expect(database.getDocument('users', created.userId)).toMatchObject({
      termsAcceptedAt: FIXED_TIME,
      privacyAcceptedAt: FIXED_TIME,
    });
  });
});
