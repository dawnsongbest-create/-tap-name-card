import type { ErrorCode } from '../contracts/errors/error-code';

export class AuthServiceError extends Error {
  constructor(
    readonly code: ErrorCode,
    message = code,
  ) {
    super(message);
    this.name = 'AuthServiceError';
  }
}
