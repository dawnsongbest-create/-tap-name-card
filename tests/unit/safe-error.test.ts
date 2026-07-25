import { describe, expect, it } from 'vitest';

import { formatSafeError } from '../../shared/errors/safe-error';

describe('safe error mapping', () => {
  it('does not expose internal messages or stacks', () => {
    const internalError = new Error('database password leaked in stack');
    const result = formatSafeError(internalError, 'req-safe');
    const serialized = JSON.stringify(result);

    expect(result).toEqual({
      error: {
        code: 'UNKNOWN_ERROR',
        message: '暂时没有完成，请稍后再试。',
      },
      requestId: 'req-safe',
    });
    expect(serialized).not.toContain('database password');
    expect(serialized).not.toContain('stack');
  });
});
