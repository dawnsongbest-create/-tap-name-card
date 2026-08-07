import {
  RENDERER_FIXTURE_SCENARIOS,
  createRendererFixtureCandidate,
  isRendererFixtureScenario,
  type RendererFixtureScenario,
} from '../../templates/fixtures/index';
import { STABLE_TEMPLATE_IDS, type TemplateId } from '../../templates/index';

export const RENDERER_LAB_TEMPLATE_IDS = [...STABLE_TEMPLATE_IDS] as const;
export const RENDERER_LAB_SCENARIOS = [...RENDERER_FIXTURE_SCENARIOS] as const;
export const MAGAZINE_RENDERER_LAB_SCENARIOS = [
  'SINGLE',
  'THREE_COLLAGE',
  'GRID_4',
  'PRIMARY_GALLERY_IMAGE_FAILED',
  'ALL_GALLERY_IMAGES_FAILED',
  'VISUAL_INSERT_IMAGE_FAILED',
] as const;

export type MagazineRendererLabScenario = (typeof MAGAZINE_RENDERER_LAB_SCENARIOS)[number];
export type RendererLabScenario = RendererFixtureScenario | MagazineRendererLabScenario;

export interface RendererLabSelection {
  readonly templateId: TemplateId;
  readonly scenario: RendererLabScenario;
}

interface LabGalleryItem {
  readonly imageRef: string;
  readonly caption?: string;
  readonly altText?: string;
}

interface LabModule {
  readonly moduleType: string;
  readonly content: Record<string, unknown>;
  readonly [key: string]: unknown;
}

interface LabCandidate {
  readonly identity: Record<string, unknown>;
  readonly modules: readonly LabModule[];
  readonly [key: string]: unknown;
}

export const INITIAL_RENDERER_LAB_SELECTION: RendererLabSelection = {
  templateId: 'T-SOCIAL-01',
  scenario: 'NORMAL',
};

export function isRendererLabTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === 'string' && (RENDERER_LAB_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

function isMagazineRendererLabScenario(value: unknown): value is MagazineRendererLabScenario {
  return (
    typeof value === 'string' &&
    (MAGAZINE_RENDERER_LAB_SCENARIOS as readonly string[]).includes(value)
  );
}

export function getRendererLabScenarios(templateId: TemplateId): readonly RendererLabScenario[] {
  return templateId === 'T-SOCIAL-02'
    ? [...RENDERER_FIXTURE_SCENARIOS, ...MAGAZINE_RENDERER_LAB_SCENARIOS]
    : RENDERER_FIXTURE_SCENARIOS;
}

export function readRendererLabSelection(
  templateId: unknown,
  scenario: unknown,
): RendererLabSelection | undefined {
  if (!isRendererLabTemplateId(templateId)) {
    return undefined;
  }

  if (isRendererFixtureScenario(scenario)) {
    return { templateId, scenario };
  }

  if (templateId === 'T-SOCIAL-02' && isMagazineRendererLabScenario(scenario)) {
    return { templateId, scenario };
  }

  return undefined;
}

function repeatGalleryItems(
  items: readonly LabGalleryItem[],
  count: number,
): readonly LabGalleryItem[] {
  return Array.from({ length: count }, (_, index) => ({ ...items[index % items.length] }));
}

function createMagazineRendererLabCandidate(scenario: MagazineRendererLabScenario): unknown {
  const base = createRendererFixtureCandidate('T-SOCIAL-02', 'NORMAL') as LabCandidate;
  const gallery = base.modules.find((module) => module.moduleType === 'PHOTO_GALLERY');

  if (!gallery) {
    return base;
  }

  const galleryContent = gallery.content as {
    readonly layout: string;
    readonly items: readonly LabGalleryItem[];
  };
  let layout = galleryContent.layout;
  let items: readonly LabGalleryItem[] = galleryContent.items.map((item) => ({ ...item }));
  let identity = { ...base.identity };

  if (scenario === 'SINGLE') {
    layout = 'SINGLE';
    items = items.slice(0, 1);
  } else if (scenario === 'THREE_COLLAGE') {
    layout = 'THREE_COLLAGE';
    items = repeatGalleryItems(items, 3);
  } else if (scenario === 'GRID_4') {
    layout = 'GRID_4';
    items = repeatGalleryItems(items, 4);
  } else if (scenario === 'PRIMARY_GALLERY_IMAGE_FAILED') {
    items = items.map((item, index) =>
      index === 0
        ? { ...item, imageRef: '/assets/templates/__magazine-primary-failure__.jpg' }
        : item,
    );
  } else if (scenario === 'ALL_GALLERY_IMAGES_FAILED') {
    items = items.map((item, index) => ({
      ...item,
      imageRef: `/assets/templates/__magazine-gallery-failure-${index}.jpg`,
    }));
  } else {
    identity = {
      ...identity,
      visual: {
        kind: 'IMAGE',
        value: '/assets/templates/__magazine-visual-insert-failure__.jpg',
        altText: '本地视觉插入失败态验证',
      },
    };
  }

  return {
    ...base,
    identity,
    modules: base.modules.map((module) =>
      module.moduleType === 'PHOTO_GALLERY'
        ? {
            ...module,
            content: {
              ...galleryContent,
              layout,
              items,
            },
          }
        : module,
    ),
  };
}

export function createRendererLabModel(selection: RendererLabSelection): unknown {
  return isRendererFixtureScenario(selection.scenario)
    ? createRendererFixtureCandidate(selection.templateId, selection.scenario)
    : createMagazineRendererLabCandidate(selection.scenario);
}
