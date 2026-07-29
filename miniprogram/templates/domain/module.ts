export const TEXT_MODULE_TYPES = ['CURRENT_STATUS', 'BIO', 'CURRENT_ROLE', 'CURRENT_GOAL'] as const;

export const LIST_MODULE_TYPES = [
  'RECENT_LIKES',
  'LONG_TERM_INTERESTS',
  'WATCHING',
  'WANT_TO_TALK',
  'CORE_SKILLS',
] as const;

export const TEMPLATE_MODULE_TYPES = [
  ...TEXT_MODULE_TYPES,
  ...LIST_MODULE_TYPES,
  'PHOTO_GALLERY',
  'PROJECTS',
  'PORTFOLIO_LINKS',
] as const;

export type TextModuleType = (typeof TEXT_MODULE_TYPES)[number];
export type ListModuleType = (typeof LIST_MODULE_TYPES)[number];
export type TemplateModuleType = (typeof TEMPLATE_MODULE_TYPES)[number];

export interface TextModuleContent {
  readonly text: string;
}

export interface ListModuleContent {
  readonly items: readonly string[];
}

export const PHOTO_GALLERY_LAYOUTS = ['SINGLE', 'TWO', 'THREE_COLLAGE', 'GRID_4'] as const;
export type PhotoGalleryLayout = (typeof PHOTO_GALLERY_LAYOUTS)[number];

export interface PhotoGalleryItem {
  readonly imageRef: string;
  readonly caption?: string;
  readonly altText?: string;
}

export interface PhotoGalleryModuleContent {
  readonly layout: PhotoGalleryLayout;
  readonly items: readonly PhotoGalleryItem[];
}

export interface ProjectItem {
  readonly projectId: string;
  readonly name: string;
  readonly summary: string;
  readonly role?: string;
  readonly contribution?: string;
  readonly result?: string;
  readonly imageRef?: string;
  readonly link?: string;
}

export interface ProjectsModuleContent {
  readonly items: readonly ProjectItem[];
}

export interface PortfolioLinkItem {
  readonly label: string;
  readonly url: string;
}

export interface PortfolioLinksModuleContent {
  readonly items: readonly PortfolioLinkItem[];
}

interface RenderModuleBase<TType extends TemplateModuleType, TContent> {
  readonly moduleId: string;
  readonly moduleType: TType;
  readonly visible: boolean;
  readonly order: number;
  readonly content: TContent;
}

export type TextRenderModule = RenderModuleBase<TextModuleType, TextModuleContent>;
export type ListRenderModule = RenderModuleBase<ListModuleType, ListModuleContent>;
export type PhotoGalleryRenderModule = RenderModuleBase<'PHOTO_GALLERY', PhotoGalleryModuleContent>;
export type ProjectsRenderModule = RenderModuleBase<'PROJECTS', ProjectsModuleContent>;
export type PortfolioLinksRenderModule = RenderModuleBase<
  'PORTFOLIO_LINKS',
  PortfolioLinksModuleContent
>;

export type RenderModule =
  | TextRenderModule
  | ListRenderModule
  | PhotoGalleryRenderModule
  | ProjectsRenderModule
  | PortfolioLinksRenderModule;

export function selectVisibleModules(modules: readonly RenderModule[]): readonly RenderModule[] {
  return [...modules]
    .filter((module) => module.visible)
    .sort((left, right) => left.order - right.order);
}
