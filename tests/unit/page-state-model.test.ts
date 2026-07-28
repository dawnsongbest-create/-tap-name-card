import { describe, expect, it, vi } from 'vitest';

import {
  emitPageStateRetryIntent,
  getPageStateViewModel,
  type PageStateKind,
} from '../../miniprogram/components/page-state/model';

const INCLUDED_PAGE_STATES = [
  'ready',
  'loading',
  'empty',
  'network-error',
  'forbidden',
  'not-found',
  'unavailable',
] as const satisfies readonly PageStateKind[];

describe('page state model', () => {
  it.each(INCLUDED_PAGE_STATES)('returns a complete safe model for %s', (kind) => {
    const model = getPageStateViewModel(kind);

    expect(model.kind).toBe(kind);
    expect(model.title.length).toBeGreaterThan(0);
    expect(model.message.length).toBeGreaterThan(0);
    expect(model.title).not.toMatch(/openId|identityKey|CloudBase|stack/u);
    expect(model.message).not.toMatch(/openId|identityKey|CloudBase|stack/u);
  });

  it('marks loading, empty and ready as non-error states without retry', () => {
    for (const kind of ['loading', 'empty', 'ready'] as const) {
      expect(getPageStateViewModel(kind)).toMatchObject({
        kind,
        isError: false,
        showRetry: false,
      });
    }
  });

  it('only exposes retry for safe read failures', () => {
    expect(getPageStateViewModel('network-error').showRetry).toBe(true);
    expect(getPageStateViewModel('unavailable').showRetry).toBe(true);
    expect(getPageStateViewModel('forbidden').showRetry).toBe(false);
    expect(getPageStateViewModel('not-found').showRetry).toBe(false);
  });

  it('uses safe local error messages for all failure states', () => {
    for (const kind of ['network-error', 'forbidden', 'not-found', 'unavailable'] as const) {
      expect(getPageStateViewModel(kind).isError).toBe(true);
      expect(getPageStateViewModel(kind).message.length).toBeGreaterThan(0);
    }
  });

  it('falls back safely without reflecting an unsupported state value', () => {
    const unsafeKind = 'synthetic-openId-stack-CloudBase-detail';
    const model = getPageStateViewModel(unsafeKind);
    const unavailableModel = getPageStateViewModel('unavailable');

    expect(model).toMatchObject({
      kind: 'unavailable',
      isError: true,
      showRetry: false,
      title: unavailableModel.title,
      message: unavailableModel.message,
    });
    expect(model).not.toEqual(unavailableModel);
    expect(JSON.stringify(model)).not.toContain(unsafeKind);
    expect(unavailableModel.showRetry).toBe(true);
  });

  it('keeps the existing error and retry inputs as canonical compatibility aliases', () => {
    expect(getPageStateViewModel('error')).toMatchObject({
      kind: 'unavailable',
      isError: true,
      showRetry: false,
    });
    expect(getPageStateViewModel('retry')).toEqual(getPageStateViewModel('network-error'));
  });

  it('emits exactly one retry intent without owning reload behavior', () => {
    const emit = vi.fn();

    emitPageStateRetryIntent(emit);

    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('retry');
  });
});
