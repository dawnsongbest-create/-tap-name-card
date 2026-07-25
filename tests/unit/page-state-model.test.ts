import { describe, expect, it } from 'vitest';

import {
  getPageStateViewModel,
  type PageStateKind,
} from '../../miniprogram/components/page-state/model';

describe('page state model', () => {
  it.each<PageStateKind>(['loading', 'empty', 'error', 'retry', 'ready'])(
    'returns a complete model for %s',
    (kind) => {
      const model = getPageStateViewModel(kind);

      expect(model.kind).toBe(kind);
      expect(model.title.length).toBeGreaterThan(0);
      expect(model.message.length).toBeGreaterThan(0);
    },
  );

  it('only exposes the retry action for retry state', () => {
    expect(getPageStateViewModel('retry').showRetry).toBe(true);
    expect(getPageStateViewModel('error').showRetry).toBe(false);
  });

  it('falls back to a safe error model for an unsupported state', () => {
    expect(getPageStateViewModel('unsupported')).toEqual(getPageStateViewModel('error'));
  });
});
