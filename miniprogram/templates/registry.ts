import {
  STABLE_TEMPLATE_IDS,
  TEMPLATE_CATEGORIES,
  parseTemplateRegistryEntry,
  type TemplateCategory,
  type TemplateDefinition,
  type TemplateId,
} from './domain';
import {
  ANIME_ROLE_TEMPLATE,
  APPLE_MINIMAL_TEMPLATE,
  MAGAZINE_TEMPLATE,
  PROFESSIONAL_TEMPLATE,
  PROJECT_PORTFOLIO_TEMPLATE,
  SCRAPBOOK_TEMPLATE,
} from './definitions';
import type { TemplateRegistryEntry } from './registry-entry';

export const FALLBACK_TEMPLATE_ID_BY_CATEGORY: Readonly<Record<TemplateCategory, TemplateId>> = {
  SOCIAL: 'T-SOCIAL-01',
  RESUME: 'T-RESUME-01',
};

const DEFAULT_TEMPLATE_REGISTRATIONS: readonly TemplateRegistryEntry[] = [
  { definition: APPLE_MINIMAL_TEMPLATE, isCategoryFallback: true },
  { definition: MAGAZINE_TEMPLATE, isCategoryFallback: false },
  { definition: SCRAPBOOK_TEMPLATE, isCategoryFallback: false },
  { definition: ANIME_ROLE_TEMPLATE, isCategoryFallback: false },
  { definition: PROFESSIONAL_TEMPLATE, isCategoryFallback: true },
  { definition: PROJECT_PORTFOLIO_TEMPLATE, isCategoryFallback: false },
];

export type TemplateResolutionReason =
  'UNKNOWN_TEMPLATE' | 'UNSUPPORTED_VERSION' | 'CATEGORY_MISMATCH';

export type TemplateResolution =
  | {
      readonly status: 'resolved';
      readonly definition: TemplateDefinition;
    }
  | {
      readonly status: 'fallback';
      readonly definition: TemplateDefinition;
      readonly reason: TemplateResolutionReason;
    };

export interface TemplateRegistry {
  list(): readonly TemplateDefinition[];
  filterByCategory(category: TemplateCategory): readonly TemplateDefinition[];
  get(templateId: string): TemplateDefinition | undefined;
  resolve(
    templateId: string,
    templateVersion: number,
    expectedCategory: TemplateCategory,
  ): TemplateResolution;
}

function parseRegistrations(registrations: readonly unknown[]): readonly TemplateRegistryEntry[] {
  return registrations.map((registration) => parseTemplateRegistryEntry(registration));
}

function validateRegistryEntries(entries: readonly TemplateRegistryEntry[]): void {
  if (entries.length === 0) {
    throw new Error('Template registry must contain at least one template.');
  }

  const registeredIds = entries.map((entry) => entry.definition.templateId);

  if (new Set(registeredIds).size !== registeredIds.length) {
    throw new Error('Template registry contains a duplicate template ID.');
  }

  for (const category of TEMPLATE_CATEGORIES) {
    const fallbackEntries = entries.filter(
      (entry) => entry.definition.category === category && entry.isCategoryFallback,
    );

    if (fallbackEntries.length !== 1) {
      throw new Error(`Template registry has an invalid ${category} fallback.`);
    }
  }
}

function validateProductionCatalog(entries: readonly TemplateRegistryEntry[]): void {
  if (entries.length !== STABLE_TEMPLATE_IDS.length) {
    throw new Error('Production template catalog must contain exactly six templates.');
  }

  const registeredIds = entries.map((entry) => entry.definition.templateId);

  if (!registeredIds.every((templateId, index) => templateId === STABLE_TEMPLATE_IDS[index])) {
    throw new Error('Production template catalog IDs or order are invalid.');
  }

  if (
    entries.filter((entry) => entry.definition.category === 'SOCIAL').length !== 4 ||
    entries.filter((entry) => entry.definition.category === 'RESUME').length !== 2
  ) {
    throw new Error(
      'Production template catalog must contain four SOCIAL and two RESUME templates.',
    );
  }

  for (const category of TEMPLATE_CATEGORIES) {
    const fallback = entries.find(
      (entry) => entry.definition.category === category && entry.isCategoryFallback,
    );

    if (fallback?.definition.templateId !== FALLBACK_TEMPLATE_ID_BY_CATEGORY[category]) {
      throw new Error(`Production template catalog has an invalid ${category} fallback.`);
    }
  }
}

function buildTemplateRegistry(entries: readonly TemplateRegistryEntry[]): TemplateRegistry {
  const definitions = entries.map((entry) => entry.definition);
  const definitionsById = new Map(
    definitions.map((definition) => [definition.templateId, definition]),
  );
  const fallbackByCategory = new Map(
    entries
      .filter((entry) => entry.isCategoryFallback)
      .map((entry) => [entry.definition.category, entry.definition]),
  );

  function getFallback(category: TemplateCategory): TemplateDefinition {
    const fallback = fallbackByCategory.get(category);

    if (!fallback) {
      throw new Error(`Template registry has no ${category} fallback.`);
    }

    return fallback;
  }

  return {
    list: () => [...definitions],
    filterByCategory: (category) =>
      definitions.filter((definition) => definition.category === category),
    get: (templateId) => definitionsById.get(templateId as TemplateId),
    resolve: (templateId, templateVersion, expectedCategory) => {
      const definition = definitionsById.get(templateId as TemplateId);

      if (!definition) {
        return {
          status: 'fallback',
          definition: getFallback(expectedCategory),
          reason: 'UNKNOWN_TEMPLATE',
        };
      }

      if (definition.category !== expectedCategory) {
        return {
          status: 'fallback',
          definition: getFallback(expectedCategory),
          reason: 'CATEGORY_MISMATCH',
        };
      }

      if (definition.templateVersion !== templateVersion) {
        return {
          status: 'fallback',
          definition: getFallback(expectedCategory),
          reason: 'UNSUPPORTED_VERSION',
        };
      }

      return { status: 'resolved', definition };
    },
  };
}

export function createTemplateRegistry(registrations: readonly unknown[]): TemplateRegistry {
  const entries = parseRegistrations(registrations);
  validateRegistryEntries(entries);
  return buildTemplateRegistry(entries);
}

export function createProductionTemplateRegistry(
  registrations: readonly unknown[],
): TemplateRegistry {
  const entries = parseRegistrations(registrations);
  validateRegistryEntries(entries);
  validateProductionCatalog(entries);
  return buildTemplateRegistry(entries);
}

export const templateRegistry = createProductionTemplateRegistry(DEFAULT_TEMPLATE_REGISTRATIONS);
