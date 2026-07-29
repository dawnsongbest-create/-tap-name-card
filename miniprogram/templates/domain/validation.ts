import {
  parseBoolean,
  parseEnum,
  parseNumber,
  parseObject,
  parseOptional,
  parseString,
} from '../../shared/validation/runtime';
import type { TemplateRegistryEntry } from '../registry-entry';
import {
  LIST_MODULE_TYPES,
  PHOTO_GALLERY_LAYOUTS,
  TEMPLATE_MODULE_TYPES,
  TEXT_MODULE_TYPES,
  type ListModuleContent,
  type PhotoGalleryItem,
  type PhotoGalleryModuleContent,
  type PortfolioLinkItem,
  type PortfolioLinksModuleContent,
  type ProjectItem,
  type ProjectsModuleContent,
  type RenderModule,
  type ListModuleType,
  type TemplateModuleType,
  type TextModuleContent,
  type TextModuleType,
} from './module';
import {
  RENDER_MODEL_VERSION,
  RENDER_VISUAL_KINDS,
  type RenderIdentity,
  type RenderModel,
  type RenderVisual,
} from './render-model';
import {
  EXPECTED_TEMPLATE_CATEGORY,
  STABLE_TEMPLATE_IDS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_EDITOR_LEVELS,
  TEMPLATE_SCHEMA_VERSION,
  TEMPLATE_VERSION,
  type TemplateDefinition,
  type TemplateDisplayMetadata,
  type TemplateId,
  type TemplateModuleCapabilities,
} from './template-definition';

function parseArray<TValue>(
  value: unknown,
  parser: (item: unknown, index: number) => TValue,
): readonly TValue[] {
  if (!Array.isArray(value)) {
    throw new Error('Expected an array.');
  }

  return value.map(parser);
}

function parseNonEmptyString(value: unknown): string {
  const parsed = parseString(value);

  if (parsed.trim().length === 0) {
    throw new Error('Expected a non-empty string.');
  }

  return parsed;
}

function parseStringWithLength(
  value: unknown,
  constraints: { readonly min?: number; readonly max?: number },
): string {
  const parsed = parseString(value);
  const length = Array.from(parsed).length;

  if (
    (constraints.min !== undefined && constraints.min > 0 && parsed.trim().length === 0) ||
    (constraints.min !== undefined && length < constraints.min) ||
    (constraints.max !== undefined && length > constraints.max)
  ) {
    throw new Error('String length is outside the supported range.');
  }

  return parsed;
}

function parseV1(value: unknown, expectedVersion: 1): 1 {
  const parsed = parseNumber(value);

  if (!Number.isInteger(parsed) || parsed !== expectedVersion) {
    throw new Error('Unsupported version.');
  }

  return expectedVersion;
}

function assertUnique<TValue>(values: readonly TValue[], label: string): void {
  if (new Set(values).size !== values.length) {
    throw new Error(`Expected unique ${label}.`);
  }
}

function parseTemplateId(value: unknown): TemplateId {
  return parseEnum(value, STABLE_TEMPLATE_IDS);
}

function parseModuleType(value: unknown): TemplateModuleType {
  return parseEnum(value, TEMPLATE_MODULE_TYPES);
}

function parseModuleTypeArray(value: unknown): readonly TemplateModuleType[] {
  const parsed = parseArray(value, (item) => parseModuleType(item));
  assertUnique(parsed, 'module types');
  return parsed;
}

function parseTemplateDisplayMetadata(value: unknown): TemplateDisplayMetadata {
  const object = parseObject(value);

  return {
    name: parseNonEmptyString(object.name),
    description: parseNonEmptyString(object.description),
    positioning: parseNonEmptyString(object.positioning),
  };
}

function parseTemplateModuleCapabilities(value: unknown): TemplateModuleCapabilities {
  const object = parseObject(value);
  const supported = parseModuleTypeArray(object.supported);
  const required = parseModuleTypeArray(object.required);
  const optional = parseModuleTypeArray(object.optional);
  const supportedSet = new Set(supported);
  const requiredSet = new Set(required);

  for (const moduleType of [...required, ...optional]) {
    if (!supportedSet.has(moduleType)) {
      throw new Error('Required and optional modules must be supported.');
    }
  }

  for (const moduleType of optional) {
    if (requiredSet.has(moduleType)) {
      throw new Error('Required and optional modules must be disjoint.');
    }
  }

  if (new Set([...required, ...optional]).size !== supported.length) {
    throw new Error('Every supported module must be classified as required or optional.');
  }

  return { supported, required, optional };
}

export function parseTemplateDefinition(value: unknown): TemplateDefinition {
  const object = parseObject(value);
  const templateId = parseTemplateId(object.templateId);
  const category = parseEnum(object.category, TEMPLATE_CATEGORIES);

  if (EXPECTED_TEMPLATE_CATEGORY[templateId] !== category) {
    throw new Error('Template ID and category do not match.');
  }

  return {
    templateId,
    templateSchemaVersion: parseV1(object.templateSchemaVersion, TEMPLATE_SCHEMA_VERSION),
    templateVersion: parseV1(object.templateVersion, TEMPLATE_VERSION),
    category,
    display: parseTemplateDisplayMetadata(object.display),
    editorLevel: parseEnum(object.editorLevel, TEMPLATE_EDITOR_LEVELS),
    moduleCapabilities: parseTemplateModuleCapabilities(object.moduleCapabilities),
  };
}

function parseDomainList(
  value: unknown,
  constraints: { readonly maxItems: number; readonly maxItemLength?: number },
): readonly string[] {
  const items = parseArray(value, (item) =>
    parseStringWithLength(item, {
      min: 1,
      ...(constraints.maxItemLength === undefined ? {} : { max: constraints.maxItemLength }),
    }),
  );

  if (items.length > constraints.maxItems) {
    throw new Error('List contains too many items.');
  }

  return items;
}

function parseTextModuleContent(value: unknown, moduleType: TextModuleType): TextModuleContent {
  const object = parseObject(value);
  const maximumLength: Partial<Record<TextModuleType, number>> = {
    CURRENT_STATUS: 60,
    BIO: 300,
    CURRENT_ROLE: 40,
  };

  return {
    text: parseStringWithLength(object.text, {
      min: 1,
      ...(maximumLength[moduleType] === undefined ? {} : { max: maximumLength[moduleType] }),
    }),
  };
}

function parseListModuleContent(value: unknown, moduleType: ListModuleType): ListModuleContent {
  const object = parseObject(value);
  const constraints: Readonly<
    Record<ListModuleType, { readonly maxItems: number; readonly maxItemLength?: number }>
  > = {
    RECENT_LIKES: { maxItems: 6, maxItemLength: 30 },
    LONG_TERM_INTERESTS: { maxItems: 8 },
    WATCHING: { maxItems: 6 },
    WANT_TO_TALK: { maxItems: 8 },
    CORE_SKILLS: { maxItems: 6 },
  };

  return {
    items: parseDomainList(object.items, constraints[moduleType]),
  };
}

function parsePhotoGalleryItem(value: unknown): PhotoGalleryItem {
  const object = parseObject(value);
  const caption = parseOptional(object.caption, (item) => parseStringWithLength(item, { max: 30 }));
  const altText = parseOptional(object.altText, parseNonEmptyString);

  return {
    imageRef: parseNonEmptyString(object.imageRef),
    ...(caption === undefined ? {} : { caption }),
    ...(altText === undefined ? {} : { altText }),
  };
}

function parsePhotoGalleryModuleContent(value: unknown): PhotoGalleryModuleContent {
  const object = parseObject(value);
  const layout = parseEnum(object.layout, PHOTO_GALLERY_LAYOUTS);
  const items = parseArray(object.items, (item) => parsePhotoGalleryItem(item));
  const expectedPhotoCount: Readonly<Record<typeof layout, number>> = {
    SINGLE: 1,
    TWO: 2,
    THREE_COLLAGE: 3,
    GRID_4: 4,
  };

  if (items.length < 1 || items.length > 4 || items.length !== expectedPhotoCount[layout]) {
    throw new Error('Photo gallery layout does not match its image count.');
  }

  return { layout, items };
}

const SAFE_PUBLIC_LINK_PATTERN = /^https:\/\/[^\s/?#]+(?:[/?#][^\s]*)?$/u;

function parseSafePublicLink(value: unknown): string {
  const parsed = parseNonEmptyString(value);

  if (!SAFE_PUBLIC_LINK_PATTERN.test(parsed)) {
    throw new Error('Expected a safe HTTPS public link.');
  }

  return parsed;
}

function parseProjectItem(value: unknown): ProjectItem {
  const object = parseObject(value);
  const role = parseOptional(object.role, parseNonEmptyString);
  const contribution = parseOptional(object.contribution, parseNonEmptyString);
  const result = parseOptional(object.result, parseNonEmptyString);
  const imageRef = parseOptional(object.imageRef, parseNonEmptyString);
  const link = parseOptional(object.link, parseSafePublicLink);

  return {
    projectId: parseNonEmptyString(object.projectId),
    name: parseNonEmptyString(object.name),
    summary: parseStringWithLength(object.summary, { min: 1, max: 500 }),
    ...(role === undefined ? {} : { role }),
    ...(contribution === undefined ? {} : { contribution }),
    ...(result === undefined ? {} : { result }),
    ...(imageRef === undefined ? {} : { imageRef }),
    ...(link === undefined ? {} : { link }),
  };
}

function parseProjectsModuleContent(value: unknown): ProjectsModuleContent {
  const object = parseObject(value);
  const items = parseArray(object.items, (item) => parseProjectItem(item));

  if (items.length < 1 || items.length > 5) {
    throw new Error('Projects must contain between one and five items.');
  }

  return { items };
}

function parsePortfolioLinkItem(value: unknown): PortfolioLinkItem {
  const object = parseObject(value);
  return {
    label: parseNonEmptyString(object.label),
    url: parseSafePublicLink(object.url),
  };
}

function parsePortfolioLinksModuleContent(value: unknown): PortfolioLinksModuleContent {
  const object = parseObject(value);
  const items = parseArray(object.items, (item) => parsePortfolioLinkItem(item));

  if (items.length < 1 || items.length > 10) {
    throw new Error('Portfolio links must contain between one and ten items.');
  }

  return { items };
}

export function parseRenderModule(value: unknown): RenderModule {
  const object = parseObject(value);
  const moduleId = parseNonEmptyString(object.moduleId);
  const moduleType = parseModuleType(object.moduleType);
  const visible = parseBoolean(object.visible);
  const order = parseNumber(object.order);

  if (!Number.isInteger(order) || order < 0) {
    throw new Error('Module order must be a non-negative integer.');
  }

  if ((TEXT_MODULE_TYPES as readonly string[]).includes(moduleType)) {
    return {
      moduleId,
      moduleType: moduleType as (typeof TEXT_MODULE_TYPES)[number],
      visible,
      order,
      content: parseTextModuleContent(
        object.content,
        moduleType as (typeof TEXT_MODULE_TYPES)[number],
      ),
    };
  }

  if ((LIST_MODULE_TYPES as readonly string[]).includes(moduleType)) {
    return {
      moduleId,
      moduleType: moduleType as (typeof LIST_MODULE_TYPES)[number],
      visible,
      order,
      content: parseListModuleContent(
        object.content,
        moduleType as (typeof LIST_MODULE_TYPES)[number],
      ),
    };
  }

  if (moduleType === 'PHOTO_GALLERY') {
    return {
      moduleId,
      moduleType,
      visible,
      order,
      content: parsePhotoGalleryModuleContent(object.content),
    };
  }

  if (moduleType === 'PROJECTS') {
    return {
      moduleId,
      moduleType,
      visible,
      order,
      content: parseProjectsModuleContent(object.content),
    };
  }

  return {
    moduleId,
    moduleType: 'PORTFOLIO_LINKS',
    visible,
    order,
    content: parsePortfolioLinksModuleContent(object.content),
  };
}

function parseRenderVisual(value: unknown): RenderVisual {
  const object = parseObject(value);
  const kind = parseEnum(object.kind, RENDER_VISUAL_KINDS);
  const optionalValue = parseOptional(object.value, parseNonEmptyString);
  const altText = parseOptional(object.altText, parseNonEmptyString);

  if (kind === 'DEFAULT_GRAPHIC' && optionalValue !== undefined) {
    throw new Error('Default graphics must not provide a custom value.');
  }

  if (kind !== 'DEFAULT_GRAPHIC' && optionalValue === undefined) {
    throw new Error('This visual kind requires a value.');
  }

  if (kind === 'IMAGE' && altText === undefined) {
    throw new Error('Image visuals require alternative text.');
  }

  return {
    kind,
    ...(optionalValue === undefined ? {} : { value: optionalValue }),
    ...(altText === undefined ? {} : { altText }),
  };
}

function parseRenderIdentity(value: unknown): RenderIdentity {
  const object = parseObject(value);
  const visual = parseOptional(object.visual, parseRenderVisual);

  return {
    displayName: parseString(object.displayName),
    headline: parseString(object.headline),
    tags: parseArray(object.tags, (item) => parseNonEmptyString(item)),
    ...(visual === undefined ? {} : { visual }),
  };
}

export function parseRenderModel(value: unknown): RenderModel {
  const object = parseObject(value);
  const templateId = parseTemplateId(object.templateId);
  const category = parseEnum(object.category, TEMPLATE_CATEGORIES);
  const modules = parseArray(object.modules, (item) => parseRenderModule(item));

  if (EXPECTED_TEMPLATE_CATEGORY[templateId] !== category) {
    throw new Error('Render model template and category do not match.');
  }

  assertUnique(
    modules.map((module) => module.moduleId),
    'module IDs',
  );
  assertUnique(
    modules.map((module) => module.order),
    'module orders',
  );

  return {
    renderModelVersion: parseV1(object.renderModelVersion, RENDER_MODEL_VERSION),
    templateId,
    templateVersion: parseV1(object.templateVersion, TEMPLATE_VERSION),
    category,
    identity: parseRenderIdentity(object.identity),
    modules,
  };
}

export function parseTemplateRegistryEntry(value: unknown): TemplateRegistryEntry {
  const object = parseObject(value);

  return {
    definition: parseTemplateDefinition(object.definition),
    isCategoryFallback: parseBoolean(object.isCategoryFallback),
  };
}
