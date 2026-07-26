import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it, vi } from 'vitest';

import type { AuthApi } from '../../miniprogram/services/auth';
import {
  isDatabasePermissionDenied,
  isStrictCurrentUserView,
  normalizePermissionDeniedError,
  runConcurrentEnsureValidation,
  runDatabasePermissionValidation,
  runIdentityPolicyValidation,
  type MiniProgramDatabaseCloudApi,
} from '../../miniprogram/pages/foundation/final-validation';
import type { CloudFunctionResult } from '../../shared/types/cloud-function';
import type { EnvironmentConfig } from '../../shared/types/environment';
import type { RequestIdProvider } from '../../shared/types/request-id';
import type {
  AccountAcceptPoliciesInput,
  AccountAcceptPoliciesOutput,
  AccountGetMeOutput,
  AuthEnsureUserOutput,
} from '../../shared/types/auth';
import type { CurrentUserView } from '../../shared/types/user';

const DEVELOPMENT_CONFIG: EnvironmentConfig = {
  name: 'development',
  cloudEnabled: true,
  cloudEnvId: 'cloud1-d1gh2crj26320f882',
};
const LOCAL_CONFIG: EnvironmentConfig = {
  name: 'local',
  cloudEnabled: false,
};

function createUser(overrides: Partial<CurrentUserView> = {}): CurrentUserView {
  return {
    userId: 'user-safe',
    status: 'ACTIVE',
    needsPolicyAcceptance: true,
    createdAt: '2026-07-26T00:00:00.000Z',
    ...overrides,
  };
}

function createSuccess<T>(data: T, requestId: string): CloudFunctionResult<T> {
  return {
    success: true,
    data,
    requestId,
  };
}

class RecordingAuthApi implements AuthApi {
  readonly calls: string[] = [];
  readonly policyInputs: AccountAcceptPoliciesInput[] = [];
  ensureCount = 0;
  policyCount = 0;

  ensureUser(): Promise<CloudFunctionResult<AuthEnsureUserOutput>> {
    this.calls.push('authEnsureUser');
    this.ensureCount += 1;
    return Promise.resolve(createSuccess(createUser(), `req-ensure-${this.ensureCount}`));
  }

  getMe(): Promise<CloudFunctionResult<AccountGetMeOutput>> {
    this.calls.push('accountGetMe');
    return Promise.resolve(createSuccess(createUser(), 'req-get-me'));
  }

  acceptPolicies(
    input: AccountAcceptPoliciesInput,
  ): Promise<CloudFunctionResult<AccountAcceptPoliciesOutput>> {
    this.calls.push('accountAcceptPolicies');
    this.policyInputs.push(input);
    this.policyCount += 1;

    return Promise.resolve(
      createSuccess(
        {
          user: createUser({
            acceptedTermsVersion: 'v1',
            acceptedPrivacyVersion: 'v1',
            needsPolicyAcceptance: false,
          }),
          replayed: this.policyCount > 1,
        },
        `req-policy-${this.policyCount}`,
      ),
    );
  }
}

function createProbeIds(): RequestIdProvider {
  let nextId = 1;

  return {
    create: () => `validation_probe_${nextId++}`,
  };
}

function createPermissionDeniedCloudApi(
  operations: string[],
  behavior: {
    usersWriteSucceeds?: boolean;
    readSucceeds?: boolean;
    readError?: unknown;
  } = {},
): MiniProgramDatabaseCloudApi {
  const permissionDeniedError = {
    errno: -502005,
    error: {
      code: 'DATABASE_PERMISSION_DENIED',
    },
    requestId: 'req-database-permission',
  };

  return {
    database: (databaseOptions) => {
      operations.push(`database:${databaseOptions.env}`);

      return {
        collection: (collectionName) => ({
          count: () => {
            operations.push(`count:${collectionName}`);

            if (behavior.readSucceeds) {
              return Promise.resolve({ total: 0 });
            }

            return Promise.reject(behavior.readError ?? permissionDeniedError);
          },
          doc: (documentId) => ({
            set: (setOptions) => {
              operations.push(
                `set:${collectionName}:${documentId}:${JSON.stringify(setOptions.data)}`,
              );

              if (behavior.usersWriteSucceeds && collectionName === 'users') {
                return Promise.resolve({});
              }

              return Promise.reject({
                code: 'DATABASE_PERMISSION_DENIED',
              });
            },
          }),
        }),
      };
    },
  };
}

describe('foundation final development validation', () => {
  it('keeps repository, data model and runbook collection contracts aligned', () => {
    const repositoryRoot = process.cwd();
    const repositorySource = readFileSync(
      resolve(repositoryRoot, 'cloudfunctions/shared/db/cloudbase-user-repository.ts'),
      'utf8',
    );
    const dataModel = readFileSync(resolve(repositoryRoot, 'docs/DATA_MODEL.md'), 'utf8');
    const runbook = readFileSync(
      resolve(repositoryRoot, 'docs/runbooks/CLOUDBASE_DEVELOPMENT.md'),
      'utf8',
    );
    const permissionProbeSource = readFileSync(
      resolve(repositoryRoot, 'miniprogram/pages/foundation/final-validation.ts'),
      'utf8',
    );
    const environmentSource = readFileSync(
      resolve(repositoryRoot, 'miniprogram/config/env.ts'),
      'utf8',
    );

    expect(repositorySource).toContain("const USERS_COLLECTION = 'users';");
    expect(repositorySource).toContain("const IDENTITY_MAPPINGS_COLLECTION = 'identity_mappings';");
    expect(repositorySource).toContain('.doc(input.identityKey)');
    expect(dataModel).toContain('### 3.1 `users`（P0）');
    expect(dataModel).toContain('### 3.1a `identity_mappings`（P0，M1.2）');
    expect(dataModel).toContain(
      "保存字段：`userId:string*`、`provider:'WECHAT_MINIPROGRAM'*`、`createdAt:Date* [server]`。",
    );
    expect(runbook).toContain('### `users/{userId}`');
    expect(runbook).toContain('### `identity_mappings/{identityKey}`');
    expect(runbook).toMatch(/\|\s*`TERMS_VERSION`\s*\|\s*`v1`\s*\|/u);
    expect(runbook).toMatch(/\|\s*`PRIVACY_VERSION`\s*\|\s*`v1`\s*\|/u);
    expect(environmentSource).toContain(
      "const DEVELOPMENT_CLOUD_ENV_ID = 'cloud1-d1gh2crj26320f882';",
    );
    expect(permissionProbeSource).toContain(
      'database = cloudApi.database({ env: config.cloudEnvId });',
    );
    expect(permissionProbeSource).toContain("database.collection('users')");
    expect(permissionProbeSource).toContain("database.collection('identity_mappings')");
    expect(permissionProbeSource).not.toContain('.where({ _id:');
  });

  it('runs exactly five ensures, one getMe and two fixed v1 policy calls', async () => {
    const api = new RecordingAuthApi();
    const view = await runIdentityPolicyValidation(api, DEVELOPMENT_CONFIG);

    expect(api.calls).toEqual([
      'authEnsureUser',
      'authEnsureUser',
      'authEnsureUser',
      'authEnsureUser',
      'authEnsureUser',
      'accountGetMe',
      'accountAcceptPolicies',
      'accountAcceptPolicies',
    ]);
    expect(api.policyInputs).toEqual([
      {
        acceptedTermsVersion: 'v1',
        acceptedPrivacyVersion: 'v1',
      },
      {
        acceptedTermsVersion: 'v1',
        acceptedPrivacyVersion: 'v1',
      },
    ]);
    expect(view).toMatchObject({
      result: 'PASS',
      ensure: {
        totalCalls: 5,
        successCount: 5,
        failureCount: 0,
        distinctUserCount: 1,
        consistent: true,
      },
      getMe: {
        result: 'PASS',
        sameUser: true,
        statusConsistent: true,
        strictCurrentUserView: true,
        noAdditionalEnsure: true,
      },
      policies: {
        result: 'PASS',
        bothSucceeded: true,
        needsPolicyAcceptanceCleared: true,
        versionsAreV1: true,
        secondReplayed: true,
        statusUnchanged: true,
      },
      lastPolicy: {
        resultStatus: 'SUCCESS',
        clientState: 'AUTHENTICATED',
        needsPolicyAcceptance: 'false',
        acceptedTermsVersion: 'v1',
        acceptedPrivacyVersion: 'v1',
        replayed: 'true',
      },
    });
    expect(JSON.stringify(view)).not.toContain('user-safe');
  });

  it('does not run identity, policy or concurrency validation outside development', async () => {
    const api = new RecordingAuthApi();

    expect(await runIdentityPolicyValidation(api, LOCAL_CONFIG)).toBeUndefined();
    expect(await runConcurrentEnsureValidation(api, LOCAL_CONFIG)).toBeUndefined();
    expect(api.calls).toEqual([]);
  });

  it('runs twenty real caller boundaries concurrently without exposing user IDs', async () => {
    const api = new RecordingAuthApi();
    const view = await runConcurrentEnsureValidation(api, DEVELOPMENT_CONFIG);

    expect(api.calls).toHaveLength(20);
    expect(view).toEqual({
      totalCalls: 20,
      successCount: 20,
      failureCount: 0,
      distinctUserCount: 1,
      consistent: true,
    });
    expect(JSON.stringify(view)).not.toContain('user-safe');
  });

  it('fails an ensure batch when successful responses contain different users or statuses', async () => {
    let nextUser = 0;
    const api = new RecordingAuthApi();
    api.ensureUser = () => {
      nextUser += 1;
      api.calls.push('authEnsureUser');
      return Promise.resolve(
        createSuccess(
          createUser({
            userId: `different-user-${nextUser}`,
            status: nextUser % 2 === 0 ? 'RESTRICTED' : 'ACTIVE',
          }),
          `req-different-${nextUser}`,
        ),
      );
    };

    const view = await runConcurrentEnsureValidation(api, DEVELOPMENT_CONFIG, 5);

    expect(view).toEqual({
      totalCalls: 5,
      successCount: 5,
      failureCount: 0,
      distinctUserCount: 5,
      consistent: false,
    });
    expect(JSON.stringify(view)).not.toContain('different-user');
  });

  it('rejects CurrentUserView payloads containing server-private fields', () => {
    expect(isStrictCurrentUserView(createUser())).toBe(true);
    expect(
      isStrictCurrentUserView({
        ...createUser(),
        openId: 'synthetic-open-id',
      }),
    ).toBe(false);
    expect(
      isStrictCurrentUserView({
        ...createUser(),
        identityKey: 'synthetic-identity-key',
      }),
    ).toBe(false);
    expect(
      isStrictCurrentUserView({
        ...createUser(),
        termsAcceptedAt: 'synthetic-time',
      }),
    ).toBe(false);
  });

  it('recognizes only safe permission-denied evidence', () => {
    expect(isDatabasePermissionDenied({ code: 'DATABASE_PERMISSION_DENIED' })).toBe(true);
    expect(isDatabasePermissionDenied({ errCode: -502005 })).toBe(true);
    expect(isDatabasePermissionDenied({ errno: -502005 })).toBe(true);
    expect(
      isDatabasePermissionDenied({
        error: {
          code: 'DATABASE_PERMISSION_DENIED',
        },
      }),
    ).toBe(true);
    expect(isDatabasePermissionDenied({ errMsg: 'permission denied' })).toBe(true);
    expect(
      isDatabasePermissionDenied({
        errMsg: 'database.get:fail errCode: -502005',
      }),
    ).toBe(true);
    expect(isDatabasePermissionDenied({ code: 'DATABASE_TIMEOUT' })).toBe(false);
    expect(isDatabasePermissionDenied(new Error('synthetic transport failure'))).toBe(false);
  });

  it('projects only safe diagnostic fields from an errno and nested permission error', () => {
    const diagnostic = normalizePermissionDeniedError({
      errno: -502005,
      error: {
        code: 'DATABASE_PERMISSION_DENIED',
        openId: 'synthetic-open-id',
        identityKey: 'synthetic-identity-key',
      },
      requestId: 'req-safe-diagnostic',
      stack: 'synthetic-internal-stack',
      databaseResponse: {
        data: 'synthetic-private-data',
      },
    });

    expect(diagnostic).toEqual({
      operationOutcome: 'THREW_ERROR',
      count: '—',
      errorType: 'object',
      code: '—',
      errCode: '—',
      errno: '-502005',
      normalizedName: 'DATABASE_PERMISSION_DENIED',
      permissionDenied: true,
      requestId: 'req-safe-diagnostic',
    });
    expect(JSON.stringify(diagnostic)).not.toMatch(
      /synthetic-open-id|synthetic-identity-key|synthetic-internal-stack|synthetic-private-data/u,
    );
  });

  it.each([
    ['document missing', { code: 'DOCUMENT_NOT_FOUND' }, 'DOCUMENT_NOT_FOUND'],
    [
      'collection missing',
      { code: 'DATABASE_COLLECTION_NOT_EXIST' },
      'DATABASE_COLLECTION_NOT_EXIST',
    ],
    ['network error', { code: 'NETWORK_ERROR' }, 'NETWORK_ERROR'],
    ['unknown SDK error', { code: 'SOMETHING_UNDOCUMENTED' }, 'UNKNOWN_ERROR'],
  ])('keeps %s as a failed permission probe', async (_label, readError, normalizedName) => {
    const operations: string[] = [];
    const view = await runDatabasePermissionValidation(
      createPermissionDeniedCloudApi(operations, { readError }),
      DEVELOPMENT_CONFIG,
      createProbeIds(),
    );

    expect(view.usersRead).toBe('FAIL');
    expect(view.usersWrite).toBe('NOT_RUN');
    expect(view.mappingsRead).toBe('NOT_RUN');
    expect(view.mappingsWrite).toBe('NOT_RUN');
    expect(view.diagnostic.normalizedName).toBe(normalizedName);
    expect(view.diagnostic.permissionDenied).toBe(false);
    expect(view.diagnostic.operationOutcome).toBe('THREW_ERROR');
    expect(Object.values(view.diagnostic).every((value) => String(value).length > 0)).toBe(true);
  });

  it('shows RETURNED_SUCCESS and a safe count when a read resolves, while keeping FAIL', async () => {
    const operations: string[] = [];
    const view = await runDatabasePermissionValidation(
      createPermissionDeniedCloudApi(operations, { readSucceeds: true }),
      DEVELOPMENT_CONFIG,
      createProbeIds(),
    );

    expect(view.usersRead).toBe('FAIL');
    expect(view.usersWrite).toBe('NOT_RUN');
    expect(view.mappingsRead).toBe('NOT_RUN');
    expect(view.mappingsWrite).toBe('NOT_RUN');
    expect(view.diagnostic).toEqual({
      operationOutcome: 'RETURNED_SUCCESS',
      count: '0',
      errorType: 'undefined',
      code: '—',
      errCode: '—',
      errno: '—',
      normalizedName: 'RETURNED_SUCCESS',
      permissionDenied: false,
      requestId: '—',
    });
    expect(Object.values(view.diagnostic).every((value) => String(value).length > 0)).toBe(true);
  });

  it('keeps a missing error object visible as THREW_ERROR and FAIL', async () => {
    const lostErrorView = await runDatabasePermissionValidation(
      {
        database: () => ({
          collection: () => ({
            count: () => Promise.reject(undefined),
            doc: () => ({
              set: () => Promise.reject(undefined),
            }),
          }),
        }),
      },
      DEVELOPMENT_CONFIG,
      createProbeIds(),
    );

    expect(lostErrorView).toMatchObject({
      result: 'FAIL',
      usersRead: 'FAIL',
      usersWrite: 'NOT_RUN',
      mappingsRead: 'NOT_RUN',
      mappingsWrite: 'NOT_RUN',
      diagnostic: {
        operationOutcome: 'THREW_ERROR',
        count: '—',
        errorType: 'undefined',
        normalizedName: 'UNKNOWN_ERROR',
        permissionDenied: false,
      },
    });
    expect(Object.values(lostErrorView.diagnostic).every((value) => String(value).length > 0)).toBe(
      true,
    );
  });

  it('renders non-empty operation evidence for every permission-probe failure branch', () => {
    const repositoryRoot = process.cwd();
    const pageSource = readFileSync(
      resolve(repositoryRoot, 'miniprogram/pages/foundation/index.ts'),
      'utf8',
    );
    const templateSource = readFileSync(
      resolve(repositoryRoot, 'miniprogram/pages/foundation/index.wxml'),
      'utf8',
    );

    expect(pageSource).toContain("permissionOperationOutcome: 'RUNNING'");
    expect(pageSource).toContain('permissionOperationOutcome: view.diagnostic.operationOutcome');
    expect(pageSource).toContain('permissionOperationCount: view.diagnostic.count');
    expect(templateSource).toContain('{{permissionOperationOutcome}}');
    expect(templateSource).toContain('{{permissionOperationCount}}');
  });

  it('redacts unsafe diagnostic values and never logs the original SDK error', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const diagnostic = normalizePermissionDeniedError({
      code: 'synthetic-open-id',
      errCode: 'synthetic-identity-key',
      errno: 'synthetic-hmac-secret',
      errMsg: 'synthetic private database response body',
      requestId: 'unsafe\nrequest-id',
      stack: 'synthetic-internal-stack',
    });

    expect(diagnostic).toEqual({
      operationOutcome: 'THREW_ERROR',
      count: '—',
      errorType: 'object',
      code: '—',
      errCode: '—',
      errno: '—',
      normalizedName: 'UNKNOWN_ERROR',
      permissionDenied: false,
      requestId: '—',
    });
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleLog).not.toHaveBeenCalled();
    expect(JSON.stringify(diagnostic)).not.toMatch(
      /synthetic-open-id|synthetic-identity-key|synthetic-hmac-secret|synthetic-internal-stack|private database/u,
    );

    consoleError.mockRestore();
    consoleLog.mockRestore();
  });

  it('uses collection-level counts and random write documents, then passes four rejections', async () => {
    const operations: string[] = [];
    const view = await runDatabasePermissionValidation(
      createPermissionDeniedCloudApi(operations),
      DEVELOPMENT_CONFIG,
      createProbeIds(),
    );

    expect(view).toEqual({
      result: 'PASS',
      usersRead: 'PASS',
      usersWrite: 'PASS',
      mappingsRead: 'PASS',
      mappingsWrite: 'PASS',
      diagnostic: {
        operationOutcome: 'THREW_ERROR',
        count: '—',
        errorType: 'object',
        code: 'DATABASE_PERMISSION_DENIED',
        errCode: '—',
        errno: '—',
        normalizedName: 'DATABASE_PERMISSION_DENIED',
        permissionDenied: true,
        requestId: '—',
      },
    });
    expect(operations).toEqual([
      'database:cloud1-d1gh2crj26320f882',
      'count:users',
      'count:identity_mappings',
      'set:users:validation_probe_1:{"validationProbe":true}',
      'set:identity_mappings:validation_probe_2:{"validationProbe":true}',
    ]);
    expect(JSON.stringify(view)).not.toMatch(/validation_probe|openId|identityKey|HMAC/u);
  });

  it('fails immediately and does not delete or continue after an unexpected successful write', async () => {
    const operations: string[] = [];
    const view = await runDatabasePermissionValidation(
      createPermissionDeniedCloudApi(operations, { usersWriteSucceeds: true }),
      DEVELOPMENT_CONFIG,
      createProbeIds(),
    );

    expect(view).toEqual({
      result: 'FAIL',
      usersRead: 'PASS',
      usersWrite: 'FAIL',
      mappingsRead: 'PASS',
      mappingsWrite: 'NOT_RUN',
      diagnostic: {
        operationOutcome: 'RETURNED_SUCCESS',
        count: '—',
        errorType: 'undefined',
        code: '—',
        errCode: '—',
        errno: '—',
        normalizedName: 'RETURNED_SUCCESS',
        permissionDenied: false,
        requestId: '—',
      },
    });
    expect(operations).not.toContain(
      'set:identity_mappings:validation_probe_2:{"validationProbe":true}',
    );
    expect(operations.every((operation) => !operation.startsWith('delete:'))).toBe(true);
  });

  it('does not access the database outside configured development', async () => {
    const operations: string[] = [];
    const view = await runDatabasePermissionValidation(
      createPermissionDeniedCloudApi(operations),
      LOCAL_CONFIG,
      createProbeIds(),
    );

    expect(view).toEqual({
      result: 'NOT_RUN',
      usersRead: 'NOT_RUN',
      usersWrite: 'NOT_RUN',
      mappingsRead: 'NOT_RUN',
      mappingsWrite: 'NOT_RUN',
      diagnostic: {
        operationOutcome: 'NOT_RUN',
        count: '—',
        errorType: 'not-run',
        code: '—',
        errCode: '—',
        errno: '—',
        normalizedName: 'NOT_RUN',
        permissionDenied: false,
        requestId: '—',
      },
    });
    expect(operations).toEqual([]);
  });
});
