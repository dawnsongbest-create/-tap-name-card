import type { AuthApi } from '../../services/auth';
import type { CloudFunctionResult } from '../../shared/types/cloud-function';
import type { EnvironmentConfig } from '../../shared/types/environment';
import type { RequestIdProvider } from '../../shared/types/request-id';
import type { AuthEnsureUserOutput } from '../../shared/types/auth';
import type { CurrentUserStatus, CurrentUserView } from '../../shared/types/user';
import {
  createDevelopmentPolicyProbeView,
  getDevelopmentPolicyAcceptanceInput,
  type DevelopmentPolicyProbeView,
} from './policy-probe';

export type ValidationStatus = 'PASS' | 'FAIL' | 'NOT_RUN';

export interface EnsureBatchValidationView {
  totalCalls: number;
  successCount: number;
  failureCount: number;
  distinctUserCount: number;
  consistent: boolean;
}

export interface GetMeValidationView {
  result: ValidationStatus;
  sameUser: boolean;
  statusConsistent: boolean;
  strictCurrentUserView: boolean;
  noAdditionalEnsure: boolean;
}

export interface PolicySequenceValidationView {
  result: ValidationStatus;
  bothSucceeded: boolean;
  needsPolicyAcceptanceCleared: boolean;
  versionsAreV1: boolean;
  secondReplayed: boolean;
  statusUnchanged: boolean;
}

export interface IdentityPolicyValidationView {
  result: ValidationStatus;
  ensure: EnsureBatchValidationView;
  getMe: GetMeValidationView;
  policies: PolicySequenceValidationView;
  lastPolicy: DevelopmentPolicyProbeView;
}

export interface DatabasePermissionValidationView {
  result: ValidationStatus;
  usersRead: ValidationStatus;
  usersWrite: ValidationStatus;
  mappingsRead: ValidationStatus;
  mappingsWrite: ValidationStatus;
  diagnostic: SafePermissionErrorDiagnostic;
}

export interface SafePermissionErrorDiagnostic {
  operationOutcome: 'NOT_RUN' | 'RETURNED_SUCCESS' | 'THREW_ERROR';
  count: string;
  errorType: string;
  code: string;
  errCode: string;
  errno: string;
  normalizedName: string;
  permissionDenied: boolean;
  requestId: string;
}

export interface MiniProgramDatabaseDocument {
  set(options: { data: Record<string, unknown> }): Promise<unknown>;
}

export interface MiniProgramDatabase {
  collection(name: string): {
    count(): Promise<unknown>;
    doc(id: string): MiniProgramDatabaseDocument;
  };
}

export interface MiniProgramDatabaseCloudApi {
  database(options: { env: string }): MiniProgramDatabase;
}

interface UserReference {
  userId: string;
  status: CurrentUserStatus;
}

const CURRENT_USER_VIEW_KEYS = new Set([
  'userId',
  'status',
  'currentCardId',
  'acceptedTermsVersion',
  'acceptedPrivacyVersion',
  'needsPolicyAcceptance',
  'createdAt',
]);
const PERMISSION_DENIED_CODES = new Set([
  'DATABASE_PERMISSION_DENIED',
  'PERMISSION_DENIED',
  'UNAUTHORIZED',
  '-502005',
]);
const PUBLIC_ERROR_NAMES = [
  'DATABASE_PERMISSION_DENIED',
  'PERMISSION_DENIED',
  'UNAUTHORIZED',
  'DATABASE_COLLECTION_NOT_EXIST',
  'DOCUMENT_NOT_FOUND',
  'DATABASE_TIMEOUT',
  'DATABASE_REQUEST_FAILED',
  'NETWORK_ERROR',
  'INVALID_PARAM',
  'INVALID_ARGUMENT',
  'DATABASE_NOT_INITIALIZED',
] as const;
const SAFE_ERROR_CODE_PATTERN = /^(?:[A-Z][A-Z0-9_-]{0,63}|-?\d{1,12})$/u;
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
const EMPTY_DIAGNOSTIC_VALUE = '—';
const NOT_RUN_DIAGNOSTIC: SafePermissionErrorDiagnostic = {
  operationOutcome: 'NOT_RUN',
  count: EMPTY_DIAGNOSTIC_VALUE,
  errorType: 'not-run',
  code: EMPTY_DIAGNOSTIC_VALUE,
  errCode: EMPTY_DIAGNOSTIC_VALUE,
  errno: EMPTY_DIAGNOSTIC_VALUE,
  normalizedName: 'NOT_RUN',
  permissionDenied: false,
  requestId: EMPTY_DIAGNOSTIC_VALUE,
};
const NOT_RUN_PERMISSION_VIEW: DatabasePermissionValidationView = {
  result: 'NOT_RUN',
  usersRead: 'NOT_RUN',
  usersWrite: 'NOT_RUN',
  mappingsRead: 'NOT_RUN',
  mappingsWrite: 'NOT_RUN',
  diagnostic: NOT_RUN_DIAGNOSTIC,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

export function isStrictCurrentUserView(value: unknown): value is CurrentUserView {
  if (!isRecord(value) || Object.keys(value).some((key) => !CURRENT_USER_VIEW_KEYS.has(key))) {
    return false;
  }

  return (
    typeof value.userId === 'string' &&
    value.userId.length > 0 &&
    (value.status === 'ACTIVE' || value.status === 'RESTRICTED') &&
    isOptionalString(value.currentCardId) &&
    isOptionalString(value.acceptedTermsVersion) &&
    isOptionalString(value.acceptedPrivacyVersion) &&
    typeof value.needsPolicyAcceptance === 'boolean' &&
    typeof value.createdAt === 'string'
  );
}

function getValidUser<T extends CurrentUserView>(
  result: CloudFunctionResult<T>,
): CurrentUserView | undefined {
  return result.success && isStrictCurrentUserView(result.data) ? result.data : undefined;
}

function analyzeEnsureResults(results: Array<CloudFunctionResult<AuthEnsureUserOutput>>): {
  view: EnsureBatchValidationView;
  reference?: UserReference;
} {
  const users = results.map(getValidUser);
  const validUsers = users.filter((user): user is CurrentUserView => Boolean(user));
  const userIds = new Set(validUsers.map((user) => user.userId));
  const statuses = new Set(validUsers.map((user) => user.status));
  const successCount = validUsers.length;
  const referenceUser = validUsers[0];

  return {
    view: {
      totalCalls: results.length,
      successCount,
      failureCount: results.length - successCount,
      distinctUserCount: userIds.size,
      consistent:
        results.length > 0 &&
        successCount === results.length &&
        userIds.size === 1 &&
        statuses.size === 1,
    },
    ...(referenceUser
      ? {
          reference: {
            userId: referenceUser.userId,
            status: referenceUser.status,
          },
        }
      : {}),
  };
}

export async function runIdentityPolicyValidation(
  api: AuthApi,
  config: EnvironmentConfig,
): Promise<IdentityPolicyValidationView | undefined> {
  const policyInput = getDevelopmentPolicyAcceptanceInput(config);

  if (!policyInput) {
    return undefined;
  }

  let ensureCallCount = 0;
  const ensureResults: Array<CloudFunctionResult<AuthEnsureUserOutput>> = [];

  for (let index = 0; index < 5; index += 1) {
    ensureCallCount += 1;
    ensureResults.push(await api.ensureUser());
  }

  const ensureAnalysis = analyzeEnsureResults(ensureResults);
  const ensureCallCountBeforeGetMe = ensureCallCount;
  const getMeResult = await api.getMe();
  const getMeUser = getValidUser(getMeResult);
  const getMeView: GetMeValidationView = {
    result: 'FAIL',
    sameUser: Boolean(
      getMeUser && ensureAnalysis.reference && getMeUser.userId === ensureAnalysis.reference.userId,
    ),
    statusConsistent: Boolean(
      getMeUser && ensureAnalysis.reference && getMeUser.status === ensureAnalysis.reference.status,
    ),
    strictCurrentUserView: Boolean(getMeUser),
    noAdditionalEnsure: ensureCallCount === ensureCallCountBeforeGetMe,
  };
  getMeView.result =
    getMeResult.success &&
    getMeView.sameUser &&
    getMeView.statusConsistent &&
    getMeView.strictCurrentUserView &&
    getMeView.noAdditionalEnsure
      ? 'PASS'
      : 'FAIL';

  const firstPolicyResult = await api.acceptPolicies(policyInput);
  const secondPolicyResult = await api.acceptPolicies(policyInput);
  const firstPolicyUser = isStrictCurrentUserView(firstPolicyResult.data?.user)
    ? firstPolicyResult.data.user
    : undefined;
  const secondPolicyUser = isStrictCurrentUserView(secondPolicyResult.data?.user)
    ? secondPolicyResult.data.user
    : undefined;
  const policyView: PolicySequenceValidationView = {
    result: 'FAIL',
    bothSucceeded: Boolean(
      firstPolicyResult.success &&
      firstPolicyResult.data &&
      firstPolicyUser &&
      secondPolicyResult.success &&
      secondPolicyResult.data &&
      secondPolicyUser,
    ),
    needsPolicyAcceptanceCleared: Boolean(
      firstPolicyUser &&
      !firstPolicyUser.needsPolicyAcceptance &&
      secondPolicyUser &&
      !secondPolicyUser.needsPolicyAcceptance,
    ),
    versionsAreV1: Boolean(
      firstPolicyUser?.acceptedTermsVersion === 'v1' &&
      firstPolicyUser.acceptedPrivacyVersion === 'v1' &&
      secondPolicyUser?.acceptedTermsVersion === 'v1' &&
      secondPolicyUser.acceptedPrivacyVersion === 'v1',
    ),
    secondReplayed: secondPolicyResult.data?.replayed === true,
    statusUnchanged: Boolean(
      ensureAnalysis.reference &&
      firstPolicyUser?.status === ensureAnalysis.reference.status &&
      secondPolicyUser?.status === ensureAnalysis.reference.status,
    ),
  };
  policyView.result =
    policyView.bothSucceeded &&
    policyView.needsPolicyAcceptanceCleared &&
    policyView.versionsAreV1 &&
    policyView.secondReplayed &&
    policyView.statusUnchanged
      ? 'PASS'
      : 'FAIL';

  const result =
    ensureAnalysis.view.consistent && getMeView.result === 'PASS' && policyView.result === 'PASS'
      ? 'PASS'
      : 'FAIL';

  return {
    result,
    ensure: ensureAnalysis.view,
    getMe: getMeView,
    policies: policyView,
    lastPolicy: createDevelopmentPolicyProbeView(secondPolicyResult),
  };
}

export async function runConcurrentEnsureValidation(
  api: AuthApi,
  config: EnvironmentConfig,
  count = 20,
): Promise<EnsureBatchValidationView | undefined> {
  if (!getDevelopmentPolicyAcceptanceInput(config) || count <= 0) {
    return undefined;
  }

  const results = await Promise.all(Array.from({ length: count }, () => api.ensureUser()));
  return analyzeEnsureResults(results).view;
}

function readPrimitiveField(value: unknown, field: string): string | number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const fieldValue = value[field];
  return typeof fieldValue === 'string' || typeof fieldValue === 'number' ? fieldValue : undefined;
}

function projectSafeErrorCode(value: unknown): string {
  if (typeof value !== 'string' && typeof value !== 'number') {
    return EMPTY_DIAGNOSTIC_VALUE;
  }

  const normalized = String(value).trim();
  return SAFE_ERROR_CODE_PATTERN.test(normalized) ? normalized : EMPTY_DIAGNOSTIC_VALUE;
}

function getErrorContainers(error: unknown): unknown[] {
  const nestedError = isRecord(error) ? error.error : undefined;
  return nestedError === undefined ? [error] : [error, nestedError];
}

function getErrorValues(error: unknown): string[] {
  return getErrorContainers(error).flatMap((container) => {
    if (typeof container === 'string' || typeof container === 'number') {
      return [String(container)];
    }

    return ['code', 'errCode', 'errno', 'message', 'errMsg']
      .map((field) => readPrimitiveField(container, field))
      .filter((value): value is string | number => value !== undefined)
      .map(String);
  });
}

function normalizePublicErrorName(error: unknown): string {
  const values = getErrorValues(error);

  for (const publicName of PUBLIC_ERROR_NAMES) {
    if (
      values.some((value) => {
        const canonicalValue = value.toUpperCase().replace(/[\s-]+/gu, '_');
        return canonicalValue.includes(publicName);
      })
    ) {
      return publicName;
    }
  }

  if (values.some((value) => /(?:^|\D)-502005(?:\D|$)/u.test(value))) {
    return 'DATABASE_PERMISSION_DENIED';
  }

  return 'UNKNOWN_ERROR';
}

function readSafeRequestId(error: unknown): string {
  for (const container of getErrorContainers(error)) {
    const requestId = readPrimitiveField(container, 'requestId');

    if (typeof requestId === 'string' && SAFE_REQUEST_ID_PATTERN.test(requestId)) {
      return requestId;
    }
  }

  return EMPTY_DIAGNOSTIC_VALUE;
}

export function normalizePermissionDeniedError(error: unknown): SafePermissionErrorDiagnostic {
  const code = readPrimitiveField(error, 'code');
  const errCode = readPrimitiveField(error, 'errCode');
  const errno = readPrimitiveField(error, 'errno');
  const normalizedName = normalizePublicErrorName(error);
  const permissionDenied =
    PERMISSION_DENIED_CODES.has(normalizedName) ||
    getErrorValues(error).some((value) => PERMISSION_DENIED_CODES.has(value.trim()));

  return {
    operationOutcome: 'THREW_ERROR',
    count: EMPTY_DIAGNOSTIC_VALUE,
    errorType: typeof error,
    code: projectSafeErrorCode(code),
    errCode: projectSafeErrorCode(errCode),
    errno: projectSafeErrorCode(errno),
    normalizedName,
    permissionDenied,
    requestId: readSafeRequestId(error),
  };
}

export function isDatabasePermissionDenied(error: unknown): boolean {
  return normalizePermissionDeniedError(error).permissionDenied;
}

async function expectPermissionDenied(operation: () => Promise<unknown>): Promise<{
  status: ValidationStatus;
  diagnostic: SafePermissionErrorDiagnostic;
}> {
  try {
    const result = await operation();
    return {
      status: 'FAIL',
      diagnostic: {
        ...NOT_RUN_DIAGNOSTIC,
        operationOutcome: 'RETURNED_SUCCESS',
        count: projectSafeCount(result),
        errorType: 'undefined',
        normalizedName: 'RETURNED_SUCCESS',
      },
    };
  } catch (error) {
    const diagnostic = normalizePermissionDeniedError(error);

    return {
      status: diagnostic.permissionDenied ? 'PASS' : 'FAIL',
      diagnostic,
    };
  }
}

function projectSafeCount(result: unknown): string {
  if (!isRecord(result)) {
    return EMPTY_DIAGNOSTIC_VALUE;
  }

  const total = result.total;
  return typeof total === 'number' && Number.isSafeInteger(total) && total >= 0
    ? String(total)
    : EMPTY_DIAGNOSTIC_VALUE;
}

export async function runDatabasePermissionValidation(
  cloudApi: MiniProgramDatabaseCloudApi | undefined,
  config: EnvironmentConfig,
  probeIds: RequestIdProvider,
): Promise<DatabasePermissionValidationView> {
  if (config.name !== 'development' || !config.cloudEnabled || !config.cloudEnvId || !cloudApi) {
    return NOT_RUN_PERMISSION_VIEW;
  }

  const view: DatabasePermissionValidationView = {
    ...NOT_RUN_PERMISSION_VIEW,
    result: 'FAIL',
  };

  let database: MiniProgramDatabase;
  let usersCollection: ReturnType<MiniProgramDatabase['collection']>;
  let mappingsCollection: ReturnType<MiniProgramDatabase['collection']>;
  let usersProbeId: string;
  let mappingsProbeId: string;

  try {
    database = cloudApi.database({ env: config.cloudEnvId });
    usersCollection = database.collection('users');
    mappingsCollection = database.collection('identity_mappings');
    usersProbeId = probeIds.create();
    mappingsProbeId = probeIds.create();
  } catch (error) {
    return {
      ...view,
      usersRead: 'FAIL',
      diagnostic: normalizePermissionDeniedError(error),
    };
  }

  const usersRead = await expectPermissionDenied(() => usersCollection.count());
  view.usersRead = usersRead.status;
  view.diagnostic = usersRead.diagnostic;

  if (view.usersRead !== 'PASS') {
    return view;
  }

  const mappingsRead = await expectPermissionDenied(() => mappingsCollection.count());
  view.mappingsRead = mappingsRead.status;
  view.diagnostic = mappingsRead.diagnostic;

  if (view.mappingsRead !== 'PASS') {
    return view;
  }

  const usersWrite = await expectPermissionDenied(() =>
    usersCollection.doc(usersProbeId).set({
      data: {
        validationProbe: true,
      },
    }),
  );
  view.usersWrite = usersWrite.status;
  view.diagnostic = usersWrite.diagnostic;

  if (view.usersWrite !== 'PASS') {
    return view;
  }

  const mappingsWrite = await expectPermissionDenied(() =>
    mappingsCollection.doc(mappingsProbeId).set({
      data: {
        validationProbe: true,
      },
    }),
  );
  view.mappingsWrite = mappingsWrite.status;
  view.diagnostic = mappingsWrite.diagnostic;
  view.result =
    view.usersRead === 'PASS' &&
    view.usersWrite === 'PASS' &&
    view.mappingsRead === 'PASS' &&
    view.mappingsWrite === 'PASS'
      ? 'PASS'
      : 'FAIL';

  return view;
}

export function getWxCloudDatabaseApi(): MiniProgramDatabaseCloudApi | undefined {
  if (typeof wx.cloud === 'undefined') {
    return undefined;
  }

  const cloudApi = wx.cloud as unknown as Partial<MiniProgramDatabaseCloudApi>;
  return typeof cloudApi.database === 'function'
    ? (cloudApi as MiniProgramDatabaseCloudApi)
    : undefined;
}
