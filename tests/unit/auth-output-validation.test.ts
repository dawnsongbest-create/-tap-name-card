import { describe, expect, it } from 'vitest';

import {
  parseAccountAcceptPoliciesOutput,
  parseAccountGetMeOutput,
  parseAuthEnsureUserOutput,
} from '../../shared/validation/auth-output';

function createRemoteCurrentUser(): Record<string, unknown> {
  return {
    userId: 'user-safe',
    status: 'ACTIVE',
    currentCardId: 'card-safe',
    acceptedTermsVersion: 'v1',
    acceptedPrivacyVersion: 'v1',
    needsPolicyAcceptance: false,
    createdAt: '2026-07-27T00:00:00.000Z',
    openId: 'synthetic-open-id',
    identityKey: 'synthetic-identity-key',
    termsAcceptedAt: 'synthetic-internal-time',
    updatedAt: 'synthetic-internal-time',
  };
}

const EXPECTED_CURRENT_USER = {
  userId: 'user-safe',
  status: 'ACTIVE',
  currentCardId: 'card-safe',
  acceptedTermsVersion: 'v1',
  acceptedPrivacyVersion: 'v1',
  needsPolicyAcceptance: false,
  createdAt: '2026-07-27T00:00:00.000Z',
};

describe('identity endpoint output validation', () => {
  it('projects authEnsureUser success data onto the CurrentUserView whitelist', () => {
    const result = parseAuthEnsureUserOutput(createRemoteCurrentUser());

    expect(result).toEqual(EXPECTED_CURRENT_USER);
    expect(JSON.stringify(result)).not.toMatch(
      /openId|identityKey|termsAcceptedAt|updatedAt|synthetic-internal-time/u,
    );
  });

  it('projects accountGetMe success data onto the CurrentUserView whitelist', () => {
    const result = parseAccountGetMeOutput(createRemoteCurrentUser());

    expect(result).toEqual(EXPECTED_CURRENT_USER);
    expect(Object.keys(result).sort()).toEqual(Object.keys(EXPECTED_CURRENT_USER).sort());
  });

  it('projects accountAcceptPolicies and its nested user onto explicit whitelists', () => {
    const result = parseAccountAcceptPoliciesOutput({
      user: createRemoteCurrentUser(),
      replayed: true,
      operationId: 'synthetic-operation-id',
      internalUpdatedAt: 'synthetic-internal-time',
    });

    expect(result).toEqual({
      user: EXPECTED_CURRENT_USER,
      replayed: true,
    });
    expect(JSON.stringify(result)).not.toMatch(
      /openId|identityKey|operationId|internalUpdatedAt|synthetic-internal-time/u,
    );
  });

  it.each([
    ['missing userId', { ...createRemoteCurrentUser(), userId: undefined }],
    ['empty userId', { ...createRemoteCurrentUser(), userId: '' }],
    ['unsupported status', { ...createRemoteCurrentUser(), status: 'DELETED' }],
    [
      'invalid policy flag',
      {
        ...createRemoteCurrentUser(),
        needsPolicyAcceptance: 'false',
      },
    ],
    ['invalid createdAt', { ...createRemoteCurrentUser(), createdAt: 1_000 }],
    ['invalid optional field', { ...createRemoteCurrentUser(), currentCardId: null }],
  ])('rejects CurrentUserView with %s', (_label, value) => {
    expect(() => parseAuthEnsureUserOutput(value)).toThrow();
    expect(() => parseAccountGetMeOutput(value)).toThrow();
  });

  it('rejects malformed accountAcceptPolicies output', () => {
    expect(() =>
      parseAccountAcceptPoliciesOutput({
        user: createRemoteCurrentUser(),
        replayed: 'true',
      }),
    ).toThrow();
  });
});
