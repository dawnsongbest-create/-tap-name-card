import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import type { PreparedCardViewModel } from '../../miniprogram/components/card-renderer/model';
import { createCardRendererState } from '../../miniprogram/components/card-renderer/prepare';
import {
  createMagazinePresentation,
  createMagazineRuntimeState,
  isCurrentMagazineGalleryImageRequest,
  isCurrentMagazineIdentityImageRequest,
  markMagazineGalleryImageFailed,
  markMagazineIdentityImageFailed,
  type MagazineGalleryLayout,
  type MagazineIdentityVisualKind,
} from '../../miniprogram/components/card-renderer/renderers/magazine/presentation';
import {
  MAGAZINE_RENDERER_LAB_SCENARIOS,
  createRendererLabModel,
} from '../../miniprogram/pages/foundation/renderer-lab';
import {
  createRendererFixtureCandidate,
  type RendererFixtureScenario,
} from '../../miniprogram/templates/fixtures';
import type { PhotoGalleryRenderModule } from '../../miniprogram/templates/domain/module';

const REPOSITORY_ROOT = process.cwd();
const MAGAZINE_RENDERER_ROOT = resolve(
  REPOSITORY_ROOT,
  'miniprogram/components/card-renderer/renderers/magazine',
);

function readMagazineFile(filename: string): string {
  return readFileSync(resolve(MAGAZINE_RENDERER_ROOT, filename), 'utf8');
}

function prepareMagazineFixture(scenario: RendererFixtureScenario): PreparedCardViewModel {
  const state = createCardRendererState(createRendererFixtureCandidate('T-SOCIAL-02', scenario));

  if (state.status !== 'ready') {
    throw new Error(`Expected a ready Magazine fixture for ${scenario}.`);
  }

  return state.viewModel;
}

function prepareMagazineLabScenario(
  scenario: (typeof MAGAZINE_RENDERER_LAB_SCENARIOS)[number],
): PreparedCardViewModel {
  const state = createCardRendererState(
    createRendererLabModel({ templateId: 'T-SOCIAL-02', scenario }),
  );

  if (state.status !== 'ready') {
    throw new Error(`Expected a ready Magazine Lab scenario for ${scenario}.`);
  }

  return state.viewModel;
}

function withGalleryLayout(
  model: PreparedCardViewModel,
  layout: MagazineGalleryLayout,
  itemCount: number,
  includeBio = true,
): PreparedCardViewModel {
  const gallery = model.modules.find(
    (module): module is PhotoGalleryRenderModule => module.moduleType === 'PHOTO_GALLERY',
  );

  if (!gallery) {
    throw new Error('Expected Magazine gallery.');
  }

  const items = Array.from({ length: itemCount }, (_, index) => ({
    ...gallery.content.items[index % gallery.content.items.length],
  }));

  return {
    ...model,
    modules: model.modules
      .filter((module) => includeBio || module.moduleType !== 'BIO')
      .map((module) =>
        module.moduleType === 'PHOTO_GALLERY'
          ? {
              ...module,
              content: { layout, items },
            }
          : module,
      ),
  };
}

describe('M2.1-B2.2 Magazine presentation', () => {
  it('projects the official TWO fixture into a gallery-led split cover and editorial body', () => {
    const presentation = createMagazinePresentation(prepareMagazineFixture('NORMAL'));

    expect(presentation).toMatchObject({
      coverMode: 'SPLIT_COVER',
      galleryLayout: 'TWO',
      hasBody: true,
      hasBio: true,
      bioText: '喜欢记录城市里不起眼的角落，也喜欢听别人讲最近真正投入的事情。',
      hasIdentityVisual: false,
    });
    expect(presentation.primaryFigure).toMatchObject({
      imageRef: '/assets/templates/fixture-magazine-hero.jpg',
      role: 'primary',
    });
    expect(presentation.secondaryFigures).toMatchObject([
      { imageRef: '/assets/templates/fixture-social-identity.jpg', role: 'feature' },
    ]);
    expect(presentation.tagRows.map((tag) => tag.indexLabel)).toEqual(['01', '02', '03']);
  });

  it('uses content-driven stacked mode and length classes without truncation', () => {
    const presentation = createMagazinePresentation(prepareMagazineFixture('LONG_TEXT'));

    expect(presentation.coverMode).toBe('STACKED_EDITORIAL_COVER');
    expect(presentation.nameScale).toBe('long');
    expect(readMagazineFile('index.wxml')).not.toMatch(/ellipsis|line-clamp/iu);
    expect(readMagazineFile('index.wxss')).toContain('overflow-wrap: anywhere');
  });

  it('keeps official missing-image semantics separate from required gallery images', () => {
    const presentation = createMagazinePresentation(prepareMagazineFixture('MISSING_IMAGE'));

    expect(presentation.hasIdentityVisual).toBe(false);
    expect(presentation.identityVisualKind).toBe('');
    expect(presentation.primaryFigure.imageRef).toBe('/assets/templates/fixture-magazine-hero.jpg');
    expect(presentation.secondaryFigures).toHaveLength(1);
  });

  it('removes an absent BIO without leaving an empty body shell', () => {
    const minimal = createMagazinePresentation(prepareMagazineFixture('MINIMAL_OPTIONAL_CONTENT'));
    const singleWithoutBio = createMagazinePresentation(
      withGalleryLayout(prepareMagazineFixture('NORMAL'), 'SINGLE', 1, false),
    );

    expect(minimal).toMatchObject({ hasBio: false, hasBody: true });
    expect(singleWithoutBio).toMatchObject({ hasBio: false, hasBody: false });
  });

  it.each([
    ['SINGLE', 1, []],
    ['TWO', 2, ['feature']],
    ['THREE_COLLAGE', 3, ['dominant', 'supporting']],
    ['GRID_4', 4, ['dominant', 'closing', 'closing']],
  ] as const)('projects %s with the approved editorial hierarchy', (layout, count, roles) => {
    const presentation = createMagazinePresentation(
      withGalleryLayout(prepareMagazineFixture('NORMAL'), layout, count),
    );

    expect(presentation.galleryLayout).toBe(layout);
    expect(presentation.primaryFigure.role).toBe('primary');
    expect(presentation.secondaryFigures.map((figure) => figure.role)).toEqual([...roles]);
  });

  it('deduplicates repeated IMAGE refs while preserving every non-image editorial treatment', () => {
    const model = prepareMagazineFixture('NORMAL');
    const gallery = model.modules.find((module) => module.moduleType === 'PHOTO_GALLERY');

    if (!gallery || gallery.moduleType !== 'PHOTO_GALLERY') {
      throw new Error('Expected Magazine gallery.');
    }

    const visualKinds: readonly Exclude<MagazineIdentityVisualKind, ''>[] = [
      'IMAGE',
      'SYMBOL',
      'EMOJI',
      'TEXT',
      'DEFAULT_GRAPHIC',
    ];

    for (const visualKind of visualKinds) {
      const presentation = createMagazinePresentation({
        ...model,
        identity: {
          ...model.identity,
          visual:
            visualKind === 'DEFAULT_GRAPHIC'
              ? { kind: visualKind }
              : {
                  kind: visualKind,
                  value:
                    visualKind === 'IMAGE'
                      ? '/assets/templates/fixture-distinct-insert.jpg'
                      : visualKind === 'EMOJI'
                        ? '◌'
                        : 'identity',
                },
        },
      });

      expect(presentation.identityVisualKind).toBe(visualKind);
      expect(presentation.hasIdentityVisual).toBe(true);
    }

    const duplicate = createMagazinePresentation({
      ...model,
      identity: {
        ...model.identity,
        visual: {
          kind: 'IMAGE',
          value: gallery.content.items[0].imageRef,
          altText: '重复视觉',
        },
      },
    });

    expect(duplicate.hasIdentityVisual).toBe(false);
  });
});

describe('M2.1-B2.2 Magazine runtime image failures', () => {
  it('handles primary, secondary and all-gallery failures without mutating presentation data', () => {
    const presentation = createMagazinePresentation(prepareMagazineFixture('NORMAL'));
    const initial = createMagazineRuntimeState(presentation);
    const primaryFailed = markMagazineGalleryImageFailed(initial, presentation.primaryFigure.key);
    const allFailed = markMagazineGalleryImageFailed(
      primaryFailed,
      presentation.secondaryFigures[0].key,
    );

    expect(initial.primaryImageFailed).toBe(false);
    expect(primaryFailed).toMatchObject({
      primaryImageFailed: true,
      allGalleryImagesFailed: false,
    });
    expect(allFailed.allGalleryImagesFailed).toBe(true);
    expect(allFailed.secondaryFigures[0].imageFailed).toBe(true);
    expect(presentation.secondaryFigures[0]).not.toHaveProperty('imageFailed');
  });

  it('treats a failed SINGLE primary as all-gallery-failed', () => {
    const presentation = createMagazinePresentation(
      withGalleryLayout(prepareMagazineFixture('NORMAL'), 'SINGLE', 1),
    );
    const failed = markMagazineGalleryImageFailed(
      createMagazineRuntimeState(presentation),
      presentation.primaryFigure.key,
    );

    expect(failed.allGalleryImagesFailed).toBe(true);
  });

  it('removes only a failed identity IMAGE and resets all failure state for a new model', () => {
    const presentation = createMagazinePresentation({
      ...prepareMagazineFixture('NORMAL'),
      identity: {
        ...prepareMagazineFixture('NORMAL').identity,
        visual: {
          kind: 'IMAGE',
          value: '/assets/templates/fixture-distinct-insert.jpg',
          altText: '独立视觉插入',
        },
      },
    });
    const failed = markMagazineIdentityImageFailed(createMagazineRuntimeState(presentation));
    const reset = createMagazineRuntimeState(presentation);

    expect(failed).toMatchObject({ showIdentityVisual: false, identityImageFailed: true });
    expect(failed.primaryImageFailed).toBe(false);
    expect(reset).toMatchObject({
      primaryImageFailed: false,
      allGalleryImagesFailed: false,
      showIdentityVisual: true,
      identityImageFailed: false,
    });
  });

  it('ignores stale identity binderror requests after replacement while accepting the current image', () => {
    const stale = createMagazinePresentation(
      prepareMagazineLabScenario('VISUAL_INSERT_IMAGE_FAILED'),
    );
    const current = createMagazinePresentation(prepareMagazineLabScenario('SINGLE'));

    expect(current).toMatchObject({
      identityVisualKind: 'IMAGE',
      identityVisualValue: '/assets/templates/fixture-social-identity.jpg',
    });
    expect(isCurrentMagazineIdentityImageRequest(current, stale.identityVisualValue)).toBe(false);
    expect(isCurrentMagazineIdentityImageRequest(current, current.identityVisualValue)).toBe(true);
    expect(createMagazineRuntimeState(current)).toMatchObject({
      showIdentityVisual: true,
      identityImageFailed: false,
    });
  });

  it('ignores stale gallery binderror requests after replacement while accepting current refs', () => {
    const stale = createMagazinePresentation(
      prepareMagazineLabScenario('ALL_GALLERY_IMAGES_FAILED'),
    );
    const current = createMagazinePresentation(prepareMagazineFixture('NORMAL'));

    expect(
      isCurrentMagazineGalleryImageRequest(
        current,
        stale.primaryFigure.key,
        stale.primaryFigure.imageRef,
      ),
    ).toBe(false);
    expect(
      isCurrentMagazineGalleryImageRequest(
        current,
        stale.secondaryFigures[0].key,
        stale.secondaryFigures[0].imageRef,
      ),
    ).toBe(false);
    expect(
      isCurrentMagazineGalleryImageRequest(
        current,
        current.primaryFigure.key,
        current.primaryFigure.imageRef,
      ),
    ).toBe(true);
    expect(
      isCurrentMagazineGalleryImageRequest(
        current,
        current.secondaryFigures[0].key,
        current.secondaryFigures[0].imageRef,
      ),
    ).toBe(true);
    expect(createMagazineRuntimeState(current)).toMatchObject({
      primaryImageFailed: false,
      allGalleryImagesFailed: false,
    });
  });
});

describe('M2.1-B2.2 Magazine implementation boundaries', () => {
  it('keeps captions outside image frames and implements both cover modes and four layouts', () => {
    const template = readMagazineFile('index.wxml');
    const styles = readMagazineFile('index.wxss');

    expect(template.indexOf('magazine__caption--primary')).toBeGreaterThan(
      template.indexOf('magazine__primary-media'),
    );
    expect(template).toContain('magazine--{{coverMode}}');
    expect(styles).toContain('.magazine--STACKED_EDITORIAL_COVER');
    expect(styles).toContain('.magazine__secondary-gallery--THREE_COLLAGE');
    expect(styles).toContain('.magazine__secondary-gallery--GRID_4');
    expect(styles).toContain('.magazine__secondary-figure--closing');
  });

  it('uses numbered text tags, functional labels and no generic card or fake publication UI', () => {
    const template = readMagazineFile('index.wxml');
    const styles = readMagazineFile('index.wxss');

    expect(template).toContain('magazine__tag-number');
    expect(template).toContain('人物特写');
    expect(template).toContain('关于我');
    expect(template).toContain('图像记录');
    expect(template).not.toMatch(/<(?:button|navigator)\b/iu);
    expect(template).not.toMatch(/期号|条形码|价格|出版|lorem|subscribe|follow/iu);
    expect(styles).not.toMatch(/box-shadow|backdrop-filter|999rpx|linear-gradient/iu);
  });

  it('keeps the R1 cover content-driven and the body close to the closing rule', () => {
    const styles = readMagazineFile('index.wxss');

    expect(styles).not.toMatch(/min-height:\s*100vh/iu);
    expect(styles).toMatch(/\.magazine__cover\s*\{[^}]*padding:\s*46rpx 42rpx 24rpx/isu);
    expect(styles).toMatch(/\.magazine__body\s*\{[^}]*padding:\s*36rpx 42rpx 64rpx/isu);
    expect(styles).not.toMatch(/\.magazine__tag-row\s*\{[^}]*border-bottom/isu);
  });

  it('hides the identity insert when all gallery images fail and differentiates fallback levels', () => {
    const template = readMagazineFile('index.wxml');
    const styles = readMagazineFile('index.wxss');

    expect(template).toContain('showIdentityVisual && !allGalleryImagesFailed');
    expect(styles).toContain(
      '.magazine--all-gallery-failed .magazine__primary-media .magazine__fallback-block',
    );
    expect(styles).toContain('.magazine__secondary-media .magazine__fallback-block');
    expect(styles).toContain('.magazine__secondary-figure--closing .magazine__fallback-block');
    expect(template.match(/data-image-ref=/gu)).toHaveLength(3);
  });

  it('keeps Magazine pure, local and independent from Apple or public renderer contracts', () => {
    const source = `${readMagazineFile('index.ts')}\n${readMagazineFile('presentation.ts')}`;

    expect(source).not.toMatch(/parseRenderModel|templateRegistry|resolveRenderer|prepareCard/iu);
    expect(source).not.toMatch(
      /services|identity\/|auth|CloudBase|callFunction|navigate|redirect|setStorage|database/iu,
    );
    expect(source).not.toMatch(/apple-minimal|universal social|hero model/iu);
  });

  it('keeps the four remaining renderers as isolated B1 shells', () => {
    for (const rendererKey of ['scrapbook', 'anime-role', 'professional', 'project-portfolio']) {
      const template = readFileSync(
        resolve(
          REPOSITORY_ROOT,
          `miniprogram/components/card-renderer/renderers/${rendererKey}/index.wxml`,
        ),
        'utf8',
      );

      expect(template).toContain('B1 RENDERER SHELL');
    }
  });

  it('makes every Magazine Lab scenario parser- and capability-valid', () => {
    for (const scenario of MAGAZINE_RENDERER_LAB_SCENARIOS) {
      expect(
        createCardRendererState(createRendererLabModel({ templateId: 'T-SOCIAL-02', scenario })),
        scenario,
      ).toMatchObject({ status: 'ready', rendererKey: 'magazine' });
    }
  });

  it('ships bounded local assets and leaves no broken official gallery refs', () => {
    const model = prepareMagazineFixture('NORMAL');
    const gallery = model.modules.find((module) => module.moduleType === 'PHOTO_GALLERY');
    const assetRoot = resolve(REPOSITORY_ROOT, 'miniprogram/assets/templates');
    const magazineAsset = resolve(assetRoot, 'fixture-magazine-hero.jpg');

    if (!gallery || gallery.moduleType !== 'PHOTO_GALLERY') {
      throw new Error('Expected Magazine gallery.');
    }

    for (const item of gallery.content.items) {
      expect(existsSync(resolve(REPOSITORY_ROOT, `miniprogram${item.imageRef}`))).toBe(true);
    }

    expect(existsSync(magazineAsset)).toBe(true);
    expect(statSync(magazineAsset).size).toBeLessThan(100 * 1024);
  });
});
