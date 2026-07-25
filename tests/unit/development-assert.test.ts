import { describe, expect, it } from 'vitest';

import { developmentAssert } from '../../miniprogram/utils/assert';

describe('developmentAssert', () => {
  it('does not throw when the condition is truthy', () => {
    expect(() => developmentAssert(true, 'should pass')).not.toThrow();
  });

  it('throws a development-only diagnostic when the condition is falsy', () => {
    expect(() => developmentAssert(false, 'missing foundation config')).toThrow(
      'Development assertion failed: missing foundation config',
    );
  });
});
