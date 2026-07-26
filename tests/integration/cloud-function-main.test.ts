import { afterEach, describe, expect, it, vi } from 'vitest';

import { createAuthCloudFunctionMain } from '../../cloudfunctions/shared/platform/cloud-function-main';
import type { TrustedWxContext } from '../../cloudfunctions/shared/platform/wx-cloud-types';
import { FakeCloudBaseDatabase } from '../helpers/fake-cloudbase-database';

const TEST_ENVIRONMENT: NodeJS.ProcessEnv = {
  IDENTITY_HMAC_SECRET: 'synthetic-main-secret-at-least-32-bytes',
  EXPECTED_MINIPROGRAM_APP_ID: 'expected-app-id',
  TERMS_VERSION: '1.0.0',
  PRIVACY_VERSION: '1.0.0',
};

function createMain(
  functionName: 'authEnsureUser' | 'accountGetMe' | 'accountAcceptPolicies',
  database = new FakeCloudBaseDatabase(),
  context: TrustedWxContext = {
    OPENID: 'trusted-synthetic-open-id',
    APPID: 'expected-app-id',
  },
  environment: NodeJS.ProcessEnv = TEST_ENVIRONMENT,
) {
  return {
    database,
    main: createAuthCloudFunctionMain(functionName, {
      database,
      readTrustedWxContext: () => context,
      environment,
      createUserId: () => 'user-from-server',
    }),
  };
}

describe('deployable cloud function runtime boundary', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('uses trusted context and ignores forged top-level identity fields', async () => {
    const runtime = createMain('authEnsureUser');
    const result = await runtime.main(
      {
        input: {},
        requestId: 'req-trusted',
        openId: 'forged-open-id',
        userId: 'forged-user-id',
        APPID: 'forged-app-id',
        identityKey: 'forged-identity-key',
      },
      {
        environment: JSON.stringify({
          WX_OPENID: 'forged-context-open-id',
          WX_APPID: 'forged-context-app-id',
        }),
      },
    );

    expect(result).toMatchObject({
      success: true,
      data: {
        userId: 'user-from-server',
        status: 'ACTIVE',
      },
      requestId: 'req-trusted',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /trusted-synthetic-open-id|forged-open-id|forged-user-id|forged-app-id|forged-identity-key|forged-context-open-id|forged-context-app-id|synthetic-main-secret/u,
    );
    expect(runtime.database.getCollectionSize('users')).toBe(1);
    expect(runtime.database.getCollectionSize('identity_mappings')).toBe(1);
    expect(runtime.database.getDocument('users', 'user-from-server')?.openId).toBe(
      'trusted-synthetic-open-id',
    );
  });

  it('returns AUTH_REQUIRED when trusted identity is missing', async () => {
    const runtime = createMain('authEnsureUser', new FakeCloudBaseDatabase(), {});
    const result = await runtime.main({
      input: {},
      requestId: 'req-missing',
      openId: 'forged-open-id',
    });

    expect(result.error?.code).toBe('AUTH_REQUIRED');
    expect(runtime.database.getCollectionSize('users')).toBe(0);
  });

  it('maps APPID mismatch and missing server configuration to safe failures', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const mismatch = createMain('authEnsureUser', new FakeCloudBaseDatabase(), {
      OPENID: 'trusted-synthetic-open-id',
      APPID: 'wrong-app-id',
    });
    const missingConfig = createMain(
      'authEnsureUser',
      new FakeCloudBaseDatabase(),
      {
        OPENID: 'trusted-synthetic-open-id',
        APPID: 'expected-app-id',
      },
      {
        EXPECTED_MINIPROGRAM_APP_ID: 'expected-app-id',
        TERMS_VERSION: '1.0.0',
        PRIVACY_VERSION: '1.0.0',
      },
    );

    const mismatchResult = await mismatch.main({
      input: {},
      requestId: 'req-mismatch',
    });
    const configResult = await missingConfig.main({
      input: {},
      requestId: 'req-config',
    });

    expect(mismatchResult.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(configResult.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify([mismatchResult, configResult])).not.toMatch(
      /trusted-synthetic-open-id|wrong-app-id/u,
    );
    expect(consoleError).toHaveBeenCalledTimes(2);
    expect(consoleError.mock.calls).toEqual([
      [
        'Cloud function request failed.',
        {
          functionName: 'authEnsureUser',
          requestId: 'req-mismatch',
          errorCode: 'SERVICE_UNAVAILABLE',
        },
      ],
      [
        'Cloud function request failed.',
        {
          functionName: 'authEnsureUser',
          requestId: 'req-config',
          errorCode: 'SERVICE_UNAVAILABLE',
        },
      ],
    ]);
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(
      /trusted-synthetic-open-id|wrong-app-id|synthetic-main-secret|ServerConfigurationError|stack/u,
    );
  });

  it('never logs a complete SDK error or its sensitive fields', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const sensitiveSdkError = Object.assign(
      new Error('synthetic SDK failure with synthetic-open-id and synthetic-secret'),
      {
        code: 'DATABASE_REQUEST_FAILED',
        openId: 'synthetic-open-id',
        identityKey: 'synthetic-identity-key',
        stack: 'synthetic-internal-stack',
      },
    );
    const main = createAuthCloudFunctionMain('authEnsureUser', {
      database: new FakeCloudBaseDatabase(),
      readTrustedWxContext: () => {
        throw sensitiveSdkError;
      },
      environment: TEST_ENVIRONMENT,
      createUserId: () => 'user-from-server',
    });

    const result = await main({
      input: {},
      requestId: 'req-safe-log',
    });

    expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(consoleError).toHaveBeenCalledWith('Cloud function request failed.', {
      functionName: 'authEnsureUser',
      requestId: 'req-safe-log',
      errorCode: 'SERVICE_UNAVAILABLE',
    });
    expect(JSON.stringify(consoleError.mock.calls)).not.toMatch(
      /synthetic-open-id|synthetic-secret|synthetic-identity-key|synthetic-internal-stack|DATABASE_REQUEST_FAILED/u,
    );
  });

  it('does not create a user from accountGetMe', async () => {
    const runtime = createMain('accountGetMe');
    const result = await runtime.main({
      input: {},
      requestId: 'req-get',
    });

    expect(result.error?.code).toBe('USER_NOT_FOUND');
    expect(runtime.database.getCollectionSize('users')).toBe(0);
    expect(runtime.database.getCollectionSize('identity_mappings')).toBe(0);
    expect(runtime.database.transactionCalls).toBe(0);
  });

  it('accepts and idempotently replays the deployed v1 policy versions', async () => {
    const database = new FakeCloudBaseDatabase();
    const environment: NodeJS.ProcessEnv = {
      ...TEST_ENVIRONMENT,
      TERMS_VERSION: 'v1',
      PRIVACY_VERSION: 'v1',
    };
    const ensure = createMain('authEnsureUser', database, undefined, environment);
    const accept = createMain('accountAcceptPolicies', database, undefined, environment);

    const ensured = await ensure.main({
      input: {},
      requestId: 'req-v1-ensure',
    });
    const first = await accept.main({
      input: {
        acceptedTermsVersion: 'v1',
        acceptedPrivacyVersion: 'v1',
      },
      requestId: 'req-v1-first',
    });
    const firstStoredUser = database.getDocument('users', 'user-from-server');
    const replay = await accept.main({
      input: {
        acceptedTermsVersion: 'v1',
        acceptedPrivacyVersion: 'v1',
      },
      requestId: 'req-v1-replay',
    });
    const replayStoredUser = database.getDocument('users', 'user-from-server');

    expect(ensured.success).toBe(true);
    expect(first).toMatchObject({
      success: true,
      data: {
        replayed: false,
        user: {
          userId: 'user-from-server',
          acceptedTermsVersion: 'v1',
          acceptedPrivacyVersion: 'v1',
          needsPolicyAcceptance: false,
        },
      },
    });
    expect(replay).toMatchObject({
      success: true,
      data: {
        replayed: true,
        user: {
          userId: 'user-from-server',
          acceptedTermsVersion: 'v1',
          acceptedPrivacyVersion: 'v1',
          needsPolicyAcceptance: false,
        },
      },
    });
    expect(firstStoredUser?.termsAcceptedAt).toEqual(firstStoredUser?.privacyAcceptedAt);
    expect(replayStoredUser?.termsAcceptedAt).toEqual(firstStoredUser?.termsAcceptedAt);
    expect(replayStoredUser?.privacyAcceptedAt).toEqual(firstStoredUser?.privacyAcceptedAt);
    expect(JSON.stringify([first, replay])).not.toMatch(
      /openId|identityKey|IDENTITY_HMAC_SECRET|termsAcceptedAt|privacyAcceptedAt|deletedAt/u,
    );
  });

  it('rejects identity fields inside business input instead of authorizing them', async () => {
    const runtime = createMain('authEnsureUser');
    const result = await runtime.main({
      input: {
        openId: 'forged-open-id',
        userId: 'forged-user-id',
      },
      requestId: 'req-input-forgery',
    });

    expect(result.error?.code).toBe('INVALID_INPUT');
    expect(runtime.database.getCollectionSize('users')).toBe(0);
  });

  it('does not reflect an unsafe client requestId into the response', async () => {
    const runtime = createMain('accountGetMe');
    const result = await runtime.main({
      input: {},
      requestId: 'synthetic-open-id\nforged-log-entry',
    });

    expect(result.error?.code).toBe('USER_NOT_FOUND');
    expect(result.requestId).toMatch(/^cloud_[A-Za-z0-9_]+$/u);
    expect(result.requestId).not.toContain('synthetic-open-id');
  });
});
