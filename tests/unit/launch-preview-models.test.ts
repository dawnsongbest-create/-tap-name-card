import { describe, expect, it } from 'vitest';

import { createCardRendererState } from '../../miniprogram/components/card-renderer/prepare';
import { getLaunchPreviewModel } from '../../miniprogram/product/launch-preview-models';
import { LAUNCH_TEMPLATE_IDS } from '../../miniprogram/product/launch-templates';
import { parseRenderModel } from '../../miniprogram/templates';

describe('FT-01 product preview models', () => {
  it.each(LAUNCH_TEMPLATE_IDS)('provides a valid deterministic %s model', (templateId) => {
    const first = getLaunchPreviewModel(templateId);
    const second = getLaunchPreviewModel(templateId);

    expect(first).toBeDefined();
    expect(first).toBe(second);
    expect(() => parseRenderModel(first)).not.toThrow();
    expect(createCardRendererState(first)).toMatchObject({
      status: 'ready',
      templateId,
      category: 'SOCIAL',
    });
  });

  it('contains only local fictional launch preview content', () => {
    const serialized = JSON.stringify(
      LAUNCH_TEMPLATE_IDS.map((templateId) => getLaunchPreviewModel(templateId)),
    );

    expect(serialized).toContain('/assets/templates/');
    expect(serialized).not.toMatch(/openId|userId|phone|email|CloudBase|__.*failure/iu);
  });

  it('does not expose deferred or arbitrary preview models', () => {
    expect(getLaunchPreviewModel('T-SOCIAL-03')).toBeUndefined();
    expect(getLaunchPreviewModel('T-RESUME-01')).toBeUndefined();
    expect(getLaunchPreviewModel('T-SOCIAL-99')).toBeUndefined();
  });
});
