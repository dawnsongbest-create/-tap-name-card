import type { CloudFunctionError } from '../types/cloud-function';
import { SAFE_ERROR_MESSAGES, type ErrorCode } from './error-code';

export interface SafeErrorResult {
  error: CloudFunctionError;
  requestId: string;
}

export function formatSafeError(
  internalError: unknown,
  requestId: string,
  code: ErrorCode = 'UNKNOWN_ERROR',
): SafeErrorResult {
  void internalError;

  return {
    error: {
      code,
      message: SAFE_ERROR_MESSAGES[code],
    },
    requestId,
  };
}
