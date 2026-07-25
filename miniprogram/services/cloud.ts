import { createFailureResult } from '../shared/cloud-function-result';
import type {
  CloudFunctionCaller,
  CloudFunctionRequest,
  CloudFunctionResult,
} from '../shared/types/cloud-function';
import type { EnvironmentConfig } from '../shared/types/environment';
import type { ErrorCode } from '../shared/errors/error-code';

const SAFE_ERROR_CODES: ReadonlySet<ErrorCode> = new Set([
  'AUTH_REQUIRED',
  'ACCOUNT_RESTRICTED',
  'ACCOUNT_DELETED',
  'USER_NOT_FOUND',
  'POLICY_VERSION_UNSUPPORTED',
  'INVALID_INPUT',
  'SERVICE_UNAVAILABLE',
  'UNKNOWN_ERROR',
]);
const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;

export interface MiniProgramCloudApi {
  init(options: { env: string }): void;
  callFunction(options: {
    name: string;
    data: {
      input: unknown;
      requestId: string;
    };
  }): Promise<{ result?: unknown }>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isRequestId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_REQUEST_ID_PATTERN.test(value);
}

function isErrorCode(value: unknown): value is ErrorCode {
  return typeof value === 'string' && SAFE_ERROR_CODES.has(value as ErrorCode);
}

function normalizeCloudFunctionResult<T>(
  value: unknown,
  fallbackRequestId: string,
): CloudFunctionResult<T> {
  if (!isRecord(value) || typeof value.success !== 'boolean') {
    return createFailureResult<T>('SERVICE_UNAVAILABLE', fallbackRequestId);
  }

  const requestId = isRequestId(value.requestId) ? value.requestId : fallbackRequestId;

  if (value.success) {
    if (!('data' in value)) {
      return createFailureResult<T>('SERVICE_UNAVAILABLE', requestId);
    }

    return {
      success: true,
      data: value.data as T,
      requestId,
    };
  }

  if (!isRecord(value.error) || !isErrorCode(value.error.code)) {
    return createFailureResult<T>('SERVICE_UNAVAILABLE', requestId);
  }

  return createFailureResult<T>(value.error.code, requestId);
}

export function createUnconfiguredCloudFunctionCaller(): CloudFunctionCaller {
  return {
    call<TInput, TOutput>(
      request: CloudFunctionRequest<TInput>,
    ): Promise<CloudFunctionResult<TOutput>> {
      return Promise.resolve(
        createFailureResult<TOutput>('SERVICE_UNAVAILABLE', request.requestId),
      );
    },
  };
}

export function initializeCloudForEnvironment(
  config: EnvironmentConfig,
  cloudApi: MiniProgramCloudApi | undefined,
): boolean {
  if (!config.cloudEnabled || !config.cloudEnvId || !cloudApi) {
    return false;
  }

  try {
    cloudApi.init({ env: config.cloudEnvId });
    return true;
  } catch {
    return false;
  }
}

export function createWxCloudFunctionCaller(cloudApi: MiniProgramCloudApi): CloudFunctionCaller {
  return {
    async call<TInput, TOutput>(
      request: CloudFunctionRequest<TInput>,
    ): Promise<CloudFunctionResult<TOutput>> {
      try {
        const response = await cloudApi.callFunction({
          name: request.name,
          data: {
            input: request.input,
            requestId: request.requestId,
          },
        });

        return normalizeCloudFunctionResult<TOutput>(response.result, request.requestId);
      } catch {
        return createFailureResult<TOutput>('SERVICE_UNAVAILABLE', request.requestId);
      }
    },
  };
}

export function createCloudFunctionCallerForEnvironment(
  config: EnvironmentConfig,
  cloudApi: MiniProgramCloudApi | undefined,
): CloudFunctionCaller {
  if (!config.cloudEnabled || !config.cloudEnvId || !cloudApi) {
    return createUnconfiguredCloudFunctionCaller();
  }

  return createWxCloudFunctionCaller(cloudApi);
}

export function getWxCloudApi(): MiniProgramCloudApi | undefined {
  if (typeof wx.cloud === 'undefined') {
    return undefined;
  }

  return wx.cloud as unknown as MiniProgramCloudApi;
}
