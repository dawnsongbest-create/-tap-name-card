import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPOSITORY_ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8');
}

describe('foundation page-state validation entry', () => {
  it.each(['ready', 'loading', 'empty', 'network-error', 'forbidden', 'not-found', 'unavailable'])(
    'renders a development-only %s demonstration',
    (kind) => {
      const templateSource = readSource('miniprogram/pages/foundation/index.wxml');

      expect(templateSource).toContain(`<page-state kind="${kind}"`);
    },
  );

  it('demonstrates a safe unsupported-state fallback', () => {
    const templateSource = readSource('miniprogram/pages/foundation/index.wxml');
    const retryBoundKinds = Array.from(
      templateSource.matchAll(/<page-state kind="([^"]+)" bind:retry="onRetry"><\/page-state>/gu),
      ([, kind]) => kind,
    );

    expect(templateSource).toContain(
      '<page-state kind="unsupported-foundation-demo"></page-state>',
    );
    expect(retryBoundKinds).toEqual(['network-error', 'unavailable']);
    expect(retryBoundKinds).not.toContain('unsupported-foundation-demo');
    expect(templateSource).toContain('非法状态安全回退');
  });

  it('keeps retry as a component intent with no endpoint or CloudBase dependency', () => {
    const componentSource = readSource('miniprogram/components/page-state/index.ts');
    const componentTemplate = readSource('miniprogram/components/page-state/index.wxml');
    const foundationSource = readSource('miniprogram/pages/foundation/index.ts');

    expect(componentSource).toContain('emitPageStateRetryIntent');
    expect(componentSource).toContain('this.triggerEvent(eventName)');
    expect(componentSource).not.toMatch(/cloud|callFunction|ensureUser|accountGetMe/u);
    expect(componentTemplate).toContain('wx:if="{{viewModel.showRetry}}"');
    expect(componentTemplate).toContain('bindtap="onRetry"');
    expect(foundationSource).toContain('onRetry()');
    expect(foundationSource).toContain('retryCount: this.data.retryCount + 1');
  });

  it('preserves every M1.2 development-only validation entry', () => {
    const pageSource = readSource('miniprogram/pages/foundation/index.ts');
    const templateSource = readSource('miniprogram/pages/foundation/index.wxml');

    for (const handler of [
      'onEnsureUser',
      'onGetMe',
      'onAcceptV1Policies',
      'onRunIdentityPolicyValidation',
      'onRunConcurrentEnsureValidation',
      'onRunDatabasePermissionValidation',
    ]) {
      expect(pageSource).toContain(`${handler}(`);
      expect(templateSource).toContain(handler);
    }
  });
});
