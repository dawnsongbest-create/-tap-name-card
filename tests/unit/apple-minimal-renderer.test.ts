import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { PreparedCardViewModel } from '../../miniprogram/components/card-renderer/model';
import { createCardRendererState } from '../../miniprogram/components/card-renderer/prepare';
import {
  createAppleMinimalPresentation,
  type AppleMinimalVisualKind,
} from '../../miniprogram/components/card-renderer/renderers/apple-minimal/presentation';
import {
  createRendererFixtureCandidate,
  type RendererFixtureScenario,
} from '../../miniprogram/templates/fixtures';

const REPOSITORY_ROOT = process.cwd();
const APPLE_RENDERER_ROOT = resolve(
  REPOSITORY_ROOT,
  'miniprogram/components/card-renderer/renderers/apple-minimal',
);

function readAppleFile(filename: string): string {
  return readFileSync(resolve(APPLE_RENDERER_ROOT, filename), 'utf8');
}

function prepareAppleFixture(scenario: RendererFixtureScenario): PreparedCardViewModel {
  const state = createCardRendererState(createRendererFixtureCandidate('T-SOCIAL-01', scenario));

  if (state.status !== 'ready') {
    throw new Error(`Expected a ready Apple fixture for ${scenario}.`);
  }

  return state.viewModel;
}

describe('M2.1-B2.1 Apple Minimal presentation', () => {
  it('derives visual, text-flow tags and optional status without changing the public model', () => {
    const presentation = createAppleMinimalPresentation(prepareAppleFixture('NORMAL'));

    expect(presentation).toMatchObject({
      hasVisual: true,
      visualKind: 'IMAGE',
      nameScale: 'short',
      tagsText: '城市散步 · 独立音乐 · 胶片摄影',
      hasStatus: true,
      statusText: '最近在学习胶片摄影。',
    });
  });

  it('provides complete no-image paths with and without optional status', () => {
    const missingImage = createAppleMinimalPresentation(prepareAppleFixture('MISSING_IMAGE'));
    const minimal = createAppleMinimalPresentation(prepareAppleFixture('MINIMAL_OPTIONAL_CONTENT'));

    expect(missingImage).toMatchObject({
      hasVisual: false,
      visualKind: '',
      hasStatus: true,
    });
    expect(minimal).toMatchObject({
      hasVisual: false,
      visualKind: '',
      hasStatus: false,
      statusText: '',
    });
  });

  it('uses local length classes instead of truncating long identity names', () => {
    const longModel = prepareAppleFixture('LONG_TEXT');
    const longPresentation = createAppleMinimalPresentation(longModel);
    const extraLongPresentation = createAppleMinimalPresentation({
      ...longModel,
      identity: {
        ...longModel.identity,
        displayName: 'AlexanderMontgomeryWithoutAnyBreakOpportunity',
      },
    });

    expect(longPresentation.nameScale).toBe('long');
    expect(extraLongPresentation.nameScale).toBe('extra-long');
    expect(readAppleFile('index.wxml')).not.toMatch(/ellipsis|line-clamp/iu);
    expect(readAppleFile('index.wxss')).toContain('overflow-wrap: anywhere');
  });

  it('maps every supported identity visual kind to an explicit template-local branch', () => {
    const template = readAppleFile('index.wxml');
    const model = prepareAppleFixture('NORMAL');
    const visualKinds: readonly Exclude<AppleMinimalVisualKind, ''>[] = [
      'IMAGE',
      'SYMBOL',
      'EMOJI',
      'TEXT',
      'DEFAULT_GRAPHIC',
    ];

    for (const visualKind of visualKinds) {
      const presentation = createAppleMinimalPresentation({
        ...model,
        identity: {
          ...model.identity,
          visual:
            visualKind === 'DEFAULT_GRAPHIC'
              ? { kind: visualKind }
              : { kind: visualKind, value: visualKind === 'EMOJI' ? '◌' : 'identity' },
        },
      });

      expect(presentation.visualKind).toBe(visualKind);
      expect(presentation.hasVisual).toBe(true);
      expect(template).toContain(`visualKind === '${visualKind}'`);
    }
  });

  it('turns an IMAGE runtime error into the same no-visual composition', () => {
    const template = readAppleFile('index.wxml');
    const component = readAppleFile('index.ts');

    expect(template).toContain('binderror="onVisualImageError"');
    expect(component).toMatch(
      /onVisualImageError\(\)[\s\S]*?hasVisual:\s*false,[\s\S]*?imageLoadFailed:\s*true/u,
    );
    expect(template).toContain(
      "hasVisual ? 'apple-minimal--with-visual' : 'apple-minimal--no-visual'",
    );
  });

  it('uses explicit square dimensions for IMAGE and DEFAULT_GRAPHIC primitives', () => {
    const styles = readAppleFile('index.wxss');

    expect(styles).toMatch(
      /\.apple-minimal__visual-image\s*\{[\s\S]*?width:\s*176rpx;[\s\S]*?height:\s*176rpx;/u,
    );
    expect(styles).toMatch(
      /\.apple-minimal__default-graphic\s*\{[\s\S]*?width:\s*176rpx;[\s\S]*?height:\s*176rpx;/u,
    );
    expect(styles).toMatch(
      /\.apple-minimal__visual-image,\s*\.apple-minimal__default-graphic\s*\{[\s\S]*?height:\s*150rpx;/u,
    );
  });

  it('keeps Apple visual code local, CTA-free and independent from generic card shells', () => {
    const template = readAppleFile('index.wxml');
    const styles = readAppleFile('index.wxss');
    const source = `${readAppleFile('index.ts')}\n${readAppleFile('presentation.ts')}`;

    expect(styles.match(/\{/gu)?.length).toBe(styles.match(/\}/gu)?.length);
    expect(template).not.toMatch(/<(?:button|navigator)\b/iu);
    expect(template).not.toContain('renderer-shell');
    expect(template).not.toMatch(/收藏|打招呼|分享|编辑|发布|关注|联系方式/u);
    expect(styles).not.toMatch(/box-shadow|backdrop-filter|999rpx|linear-gradient/iu);
    expect(source).not.toMatch(
      /services|identity\/|auth|CloudBase|callFunction|navigate|redirect|setStorage|database/iu,
    );
  });

  it('ships one bounded original local fixture image for deterministic IMAGE validation', () => {
    const fixtureSource = readFileSync(
      resolve(REPOSITORY_ROOT, 'miniprogram/templates/fixtures/index.ts'),
      'utf8',
    );
    const assetPath = resolve(
      REPOSITORY_ROOT,
      'miniprogram/assets/templates/fixture-social-identity.jpg',
    );

    expect(fixtureSource).toContain('/assets/templates/fixture-social-identity.jpg');
    expect(existsSync(assetPath)).toBe(true);
    expect(statSync(assetPath).size).toBeLessThan(100 * 1024);
  });
});
