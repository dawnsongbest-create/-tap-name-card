import { describe, expect, it } from 'vitest';

import { createFailureResult, createSuccessResult } from '../../shared/cloud-function-result';
import { createRequestId } from '../../shared/types/request-id';

describe('CloudFunctionResult helpers', () => {
  it('creates a typed success result', () => {
    expect(createSuccessResult({ value: 1 }, 'req-success')).toEqual({
      success: true,
      data: { value: 1 },
      requestId: 'req-success',
    });
  });

  it('creates a safe failure result', () => {
    expect(createFailureResult('SERVICE_UNAVAILABLE', 'req-failure')).toEqual({
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: '服务暂时不可用，请稍后再试。',
      },
      requestId: 'req-failure',
    });
  });

  it('supports deterministic request ID dependencies in tests', () => {
    expect(
      createRequestId('test', {
        now: () => 1_000,
        random: () => 0.5,
      }),
    ).toMatch(/^test_rs_[a-z0-9]+$/);
  });
});
