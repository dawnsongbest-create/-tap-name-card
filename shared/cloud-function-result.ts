import type { ErrorCode } from './errors/error-code';
import { SAFE_ERROR_MESSAGES } from './errors/error-code';
import type { CloudFunctionResult } from './types/cloud-function';

export function createSuccessResult<T>(data: T, requestId: string): CloudFunctionResult<T> {
  return {
    success: true,
    data,
    requestId,
  };
}

export function createFailureResult<T = never>(
  code: ErrorCode,
  requestId: string,
): CloudFunctionResult<T> {
  return {
    success: false,
    error: {
      code,
      message: SAFE_ERROR_MESSAGES[code],
    },
    requestId,
  };
}
