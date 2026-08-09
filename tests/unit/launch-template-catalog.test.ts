import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  LAUNCH_TEMPLATE_IDS,
  buildTemplatePreviewUrl,
  createTemplateSelectionHandoff,
  getLaunchCatalog,
  resolveLaunchTemplate,
} from '../../miniprogram/product/launch-templates';
import { STABLE_TEMPLATE_IDS, templateRegistry } from '../../miniprogram/templates';

describe('FT-01 product launch catalog', () => {
  it('projects exactly Apple Minimal and Magazine in deterministic order', () => {
    const first = getLaunchCatalog();
    const second = getLaunchCatalog();

    expect(LAUNCH_TEMPLATE_IDS).toEqual(['T-SOCIAL-01', 'T-SOCIAL-02']);
    expect(first.map((entry) => entry.templateId)).toEqual([...LAUNCH_TEMPLATE_IDS]);
    expect(first).toEqual(second);
    expect(first).not.toBe(second);
    expect(first.map((entry) => entry.display.name)).toEqual(['Apple Minimal', '杂志人物页']);
    expect(first.every((entry) => entry.category === 'SOCIAL')).toBe(true);
    expect(first.every((entry) => entry.templateVersion === 1)).toBe(true);
    expect(
      first.every((entry) => !Object.prototype.hasOwnProperty.call(entry, 'editorLevel')),
    ).toBe(true);
  });

  it('keeps the underlying production registry at six stable templates', () => {
    expect(STABLE_TEMPLATE_IDS).toEqual([
      'T-SOCIAL-01',
      'T-SOCIAL-02',
      'T-SOCIAL-03',
      'T-SOCIAL-04',
      'T-RESUME-01',
      'T-RESUME-02',
    ]);
    expect(templateRegistry.list().map((definition) => definition.templateId)).toEqual([
      ...STABLE_TEMPLATE_IDS,
    ]);
  });

  it.each(['T-SOCIAL-03', 'T-SOCIAL-04', 'T-RESUME-01', 'T-RESUME-02'] as const)(
    'rejects deferred template %s without fallback',
    (templateId) => {
      expect(resolveLaunchTemplate(templateId, 1)).toEqual({
        status: 'failure',
        reason: 'DEFERRED_TEMPLATE',
      });
    },
  );

  it('rejects arbitrary IDs and unsupported versions without fallback', () => {
    expect(resolveLaunchTemplate('T-SOCIAL-99', 1)).toEqual({
      status: 'failure',
      reason: 'INVALID_TEMPLATE',
    });
    expect(resolveLaunchTemplate('T-SOCIAL-01', 2)).toEqual({
      status: 'failure',
      reason: 'UNSUPPORTED_VERSION',
    });
    expect(resolveLaunchTemplate('T-SOCIAL-01', 'not-a-version')).toEqual({
      status: 'failure',
      reason: 'UNSUPPORTED_VERSION',
    });
  });

  it('builds the exact preview route from a canonical entry', () => {
    const entry = getLaunchCatalog()[1];

    expect(entry).toBeDefined();
    expect(buildTemplatePreviewUrl(entry!)).toBe(
      '/pages/template-preview/index?templateId=T-SOCIAL-02&templateVersion=1',
    );
  });

  it('creates a minimal two-field handoff and never copies derived category', () => {
    const result = createTemplateSelectionHandoff('T-SOCIAL-02', '1');

    expect(result).toEqual({
      status: 'valid',
      handoff: {
        templateId: 'T-SOCIAL-02',
        templateVersion: 1,
      },
    });

    if (result.status === 'valid') {
      expect(Object.keys(result.handoff).sort()).toEqual(['templateId', 'templateVersion']);
      expect(result.handoff).not.toHaveProperty('category');
    }
  });

  it('uses exact lookup instead of registry list or fallback resolution in product source', () => {
    const source = readFileSync(
      resolve(process.cwd(), 'miniprogram/product/launch-templates.ts'),
      'utf8',
    );

    expect(source).toContain('templateRegistry.get(templateId)');
    expect(source).not.toContain('templateRegistry.list(');
    expect(source).not.toContain('templateRegistry.resolve(');
    expect(source).not.toMatch(/remote|CMS|featureFlag/iu);
  });
});
