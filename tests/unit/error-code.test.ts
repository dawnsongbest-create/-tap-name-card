import { describe, expect, it } from 'vitest';

import { isErrorCode, SAFE_ERROR_MESSAGES, type ErrorCode } from '../../shared/errors/error-code';

const API_SPEC_P0_ERROR_CODES = [
  'AUTH_REQUIRED',
  'ACCOUNT_RESTRICTED',
  'ACCOUNT_DELETED',
  'USER_NOT_FOUND',
  'POLICY_VERSION_UNSUPPORTED',
  'INVALID_INPUT',
  'REQUIRED_FIELD_MISSING',
  'RESOURCE_NOT_FOUND',
  'FORBIDDEN',
  'CARD_REQUIRED',
  'CARD_NOT_PUBLISHED',
  'CARD_UNAVAILABLE',
  'CONTENT_REJECTED',
  'DUPLICATE_ACTION',
  'GREETING_ALREADY_SENT',
  'GREETING_EXPIRED',
  'GREETING_NOT_PENDING',
  'RETURN_REQUIRED',
  'CONTACT_REQUEST_PENDING',
  'CONTACT_REQUEST_COOLDOWN',
  'USER_BLOCKED',
  'RATE_LIMITED',
  'UPLOAD_FAILED',
  'AI_FAILED',
  'IMAGE_EXPORT_FAILED',
  'REVIEW_IN_PROGRESS',
  'NETWORK_ERROR',
  'SERVICE_UNAVAILABLE',
  'UNKNOWN_ERROR',
] as const satisfies readonly ErrorCode[];

describe('P0 error catalog', () => {
  it('contains exactly the ErrorCode values defined by API_SPEC', () => {
    expect(Object.keys(SAFE_ERROR_MESSAGES).sort()).toEqual([...API_SPEC_P0_ERROR_CODES].sort());
    expect(Object.values(SAFE_ERROR_MESSAGES).every((message) => message.length > 0)).toBe(true);
  });

  it('recognizes only canonical error codes at runtime', () => {
    for (const code of API_SPEC_P0_ERROR_CODES) {
      expect(isErrorCode(code)).toBe(true);
    }

    expect(isErrorCode('UNTRUSTED_PLATFORM_CODE')).toBe(false);
    expect(isErrorCode('__proto__')).toBe(false);
    expect(isErrorCode(42)).toBe(false);
  });
});
