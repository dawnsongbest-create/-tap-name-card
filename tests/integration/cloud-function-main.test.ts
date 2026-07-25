import { describe, expect, it } from 'vitest';

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
