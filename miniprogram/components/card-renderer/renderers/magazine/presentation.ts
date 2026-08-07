import type { PreparedCardViewModel } from '../../model';

export const MAGAZINE_GALLERY_LAYOUTS = ['SINGLE', 'TWO', 'THREE_COLLAGE', 'GRID_4'] as const;

export type MagazineGalleryLayout = (typeof MAGAZINE_GALLERY_LAYOUTS)[number];
export type MagazineCoverMode = 'SPLIT_COVER' | 'STACKED_EDITORIAL_COVER';
export type MagazineNameScale = 'short' | 'long' | 'extra-long';
export type MagazineHeadlineScale = 'standard' | 'long';
export type MagazineIdentityVisualKind =
  '' | 'IMAGE' | 'SYMBOL' | 'EMOJI' | 'TEXT' | 'DEFAULT_GRAPHIC';
export type MagazineFigureRole = 'primary' | 'feature' | 'dominant' | 'supporting' | 'closing';

export interface MagazineFigure {
  readonly key: string;
  readonly imageRef: string;
  readonly caption: string;
  readonly altText: string;
  readonly role: MagazineFigureRole;
}

export interface MagazineTagRow {
  readonly key: string;
  readonly indexLabel: string;
  readonly text: string;
}

export interface MagazinePresentation {
  readonly coverMode: MagazineCoverMode;
  readonly galleryLayout: MagazineGalleryLayout;
  readonly primaryFigure: MagazineFigure;
  readonly secondaryFigures: readonly MagazineFigure[];
  readonly hasBody: boolean;
  readonly hasBio: boolean;
  readonly bioText: string;
  readonly tagRows: readonly MagazineTagRow[];
  readonly hasTags: boolean;
  readonly nameScale: MagazineNameScale;
  readonly headlineScale: MagazineHeadlineScale;
  readonly hasIdentityVisual: boolean;
  readonly identityVisualKind: MagazineIdentityVisualKind;
  readonly identityVisualValue: string;
  readonly identityVisualAltText: string;
}

export interface MagazineRuntimeFigure extends MagazineFigure {
  readonly imageFailed: boolean;
}

export interface MagazineRuntimeState {
  readonly primaryImageFailed: boolean;
  readonly secondaryFigures: readonly MagazineRuntimeFigure[];
  readonly allGalleryImagesFailed: boolean;
  readonly showIdentityVisual: boolean;
  readonly identityImageFailed: boolean;
}

const EMPTY_FIGURE: MagazineFigure = {
  key: 'gallery-primary-0',
  imageRef: '',
  caption: '',
  altText: '',
  role: 'primary',
};

function countCharacters(value: string): number {
  return Array.from(value.trim()).length;
}

function deriveCoverMode(model: PreparedCardViewModel): MagazineCoverMode {
  const nameLength = countCharacters(model.identity.displayName);
  const headlineLength = countCharacters(model.identity.headline);
  const tagLength = model.identity.tags.reduce((total, tag) => total + countCharacters(tag), 0);
  const hasLongTag = model.identity.tags.some((tag) => countCharacters(tag) > 16);

  return nameLength > 12 ||
    headlineLength > 42 ||
    model.identity.tags.length > 4 ||
    tagLength > 38 ||
    hasLongTag
    ? 'STACKED_EDITORIAL_COVER'
    : 'SPLIT_COVER';
}

function deriveNameScale(displayName: string): MagazineNameScale {
  const length = countCharacters(displayName);

  if (length <= 8) {
    return 'short';
  }

  if (length <= 18) {
    return 'long';
  }

  return 'extra-long';
}

function deriveFigureRole(
  layout: MagazineGalleryLayout,
  secondaryIndex: number,
): MagazineFigureRole {
  if (layout === 'TWO') {
    return 'feature';
  }

  if (layout === 'THREE_COLLAGE') {
    return secondaryIndex === 0 ? 'dominant' : 'supporting';
  }

  if (layout === 'GRID_4') {
    return secondaryIndex === 0 ? 'dominant' : 'closing';
  }

  return 'feature';
}

function buildFigure(
  item: { readonly imageRef: string; readonly caption?: string; readonly altText?: string },
  itemIndex: number,
  layout: MagazineGalleryLayout,
): MagazineFigure {
  return {
    key: itemIndex === 0 ? 'gallery-primary-0' : `gallery-secondary-${itemIndex}`,
    imageRef: item.imageRef,
    caption: item.caption ?? '',
    altText: item.altText ?? '',
    role: itemIndex === 0 ? 'primary' : deriveFigureRole(layout, itemIndex - 1),
  };
}

function formatTagIndex(index: number): string {
  return String(index + 1).padStart(2, '0');
}

export function createMagazinePresentation(
  model: PreparedCardViewModel | null,
): MagazinePresentation {
  if (!model) {
    return {
      coverMode: 'SPLIT_COVER',
      galleryLayout: 'SINGLE',
      primaryFigure: EMPTY_FIGURE,
      secondaryFigures: [],
      hasBody: false,
      hasBio: false,
      bioText: '',
      tagRows: [],
      hasTags: false,
      nameScale: 'short',
      headlineScale: 'standard',
      hasIdentityVisual: false,
      identityVisualKind: '',
      identityVisualValue: '',
      identityVisualAltText: '',
    };
  }

  const gallery = model.modules.find((module) => module.moduleType === 'PHOTO_GALLERY');
  const bio = model.modules.find((module) => module.moduleType === 'BIO');
  const galleryLayout = gallery?.moduleType === 'PHOTO_GALLERY' ? gallery.content.layout : 'SINGLE';
  const figures =
    gallery?.moduleType === 'PHOTO_GALLERY'
      ? gallery.content.items.map((item, index) => buildFigure(item, index, galleryLayout))
      : [EMPTY_FIGURE];
  const primaryFigure = figures[0] ?? EMPTY_FIGURE;
  const secondaryFigures = figures.slice(1);
  const bioText = bio?.moduleType === 'BIO' ? bio.content.text : '';
  const identityVisual = model.identity.visual;
  const duplicatesGallery =
    identityVisual?.kind === 'IMAGE' &&
    figures.some((figure) => figure.imageRef === identityVisual.value);
  const hasIdentityVisual = identityVisual !== undefined && !duplicatesGallery;
  const tagRows = model.identity.tags.map((tag, index) => ({
    key: `tag-${index}`,
    indexLabel: formatTagIndex(index),
    text: tag,
  }));

  return {
    coverMode: deriveCoverMode(model),
    galleryLayout,
    primaryFigure,
    secondaryFigures,
    hasBody: bioText.length > 0 || secondaryFigures.length > 0,
    hasBio: bioText.length > 0,
    bioText,
    tagRows,
    hasTags: tagRows.length > 0,
    nameScale: deriveNameScale(model.identity.displayName),
    headlineScale: countCharacters(model.identity.headline) > 42 ? 'long' : 'standard',
    hasIdentityVisual,
    identityVisualKind: hasIdentityVisual ? (identityVisual?.kind ?? '') : '',
    identityVisualValue: hasIdentityVisual ? (identityVisual?.value ?? '') : '',
    identityVisualAltText: hasIdentityVisual ? (identityVisual?.altText ?? '') : '',
  };
}

export function createMagazineRuntimeState(
  presentation: MagazinePresentation,
): MagazineRuntimeState {
  return {
    primaryImageFailed: false,
    secondaryFigures: presentation.secondaryFigures.map((figure) => ({
      ...figure,
      imageFailed: false,
    })),
    allGalleryImagesFailed: false,
    showIdentityVisual: presentation.hasIdentityVisual,
    identityImageFailed: false,
  };
}

export function isCurrentMagazineGalleryImageRequest(
  presentation: Pick<MagazinePresentation, 'primaryFigure' | 'secondaryFigures'>,
  figureKey: string,
  imageRef: string,
): boolean {
  if (presentation.primaryFigure.key === figureKey) {
    return presentation.primaryFigure.imageRef === imageRef;
  }

  return presentation.secondaryFigures.some(
    (figure) => figure.key === figureKey && figure.imageRef === imageRef,
  );
}

export function isCurrentMagazineIdentityImageRequest(
  presentation: Pick<MagazinePresentation, 'identityVisualKind' | 'identityVisualValue'>,
  imageRef: string,
): boolean {
  return (
    presentation.identityVisualKind === 'IMAGE' && presentation.identityVisualValue === imageRef
  );
}

export function markMagazineGalleryImageFailed(
  state: MagazineRuntimeState,
  figureKey: string,
): MagazineRuntimeState {
  const primaryImageFailed = state.primaryImageFailed || figureKey === 'gallery-primary-0';
  const secondaryFigures = state.secondaryFigures.map((figure) =>
    figure.key === figureKey ? { ...figure, imageFailed: true } : figure,
  );

  return {
    ...state,
    primaryImageFailed,
    secondaryFigures,
    allGalleryImagesFailed:
      primaryImageFailed && secondaryFigures.every((figure) => figure.imageFailed),
  };
}

export function markMagazineIdentityImageFailed(state: MagazineRuntimeState): MagazineRuntimeState {
  return {
    ...state,
    showIdentityVisual: false,
    identityImageFailed: true,
  };
}
