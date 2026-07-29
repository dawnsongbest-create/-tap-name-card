import { describe, expect, it } from 'vitest';

import {
  FALLBACK_TEMPLATE_ID_BY_CATEGORY,
  createProductionTemplateRegistry,
  createTemplateRegistry,
  templateRegistry,
  type TemplateRegistryEntry,
} from '../../miniprogram/templates';

function createRegistrations(): TemplateRegistryEntry[] {
  return templateRegistry.list().map((definition) => ({
    definition,
    isCategoryFallback:
      definition.templateId === FALLBACK_TEMPLATE_ID_BY_CATEGORY[definition.category],
  }));
}

describe('M2.1-A local template registry', () => {
  it('builds a valid generic registry without requiring the production six-template catalog', () => {
    const registrations = createRegistrations();
    const genericRegistry = createTemplateRegistry([registrations[0], registrations[4]]);

    expect(genericRegistry.list().map((definition) => definition.templateId)).toEqual([
      'T-SOCIAL-01',
      'T-RESUME-01',
    ]);
    expect(genericRegistry.resolve('unknown', 1, 'RESUME')).toEqual({
      status: 'fallback',
      definition: genericRegistry.get('T-RESUME-01'),
      reason: 'UNKNOWN_TEMPLATE',
    });
  });

  it('lists all templates synchronously in deterministic order', () => {
    expect(templateRegistry.list().map((definition) => definition.templateId)).toEqual([
      'T-SOCIAL-01',
      'T-SOCIAL-02',
      'T-SOCIAL-03',
      'T-SOCIAL-04',
      'T-RESUME-01',
      'T-RESUME-02',
    ]);
    expect(templateRegistry.list()).toEqual(templateRegistry.list());
  });

  it('filters by category without changing category order', () => {
    expect(
      templateRegistry.filterByCategory('SOCIAL').map((definition) => definition.templateId),
    ).toEqual(['T-SOCIAL-01', 'T-SOCIAL-02', 'T-SOCIAL-03', 'T-SOCIAL-04']);
    expect(
      templateRegistry.filterByCategory('RESUME').map((definition) => definition.templateId),
    ).toEqual(['T-RESUME-01', 'T-RESUME-02']);
  });

  it('gets a known ID and returns undefined for an unknown ID', () => {
    expect(templateRegistry.get('T-SOCIAL-02')?.display.name).toBe('杂志人物页');
    expect(templateRegistry.get('T-SOCIAL-99')).toBeUndefined();
  });

  it('resolves the exact supported v1 definition', () => {
    expect(templateRegistry.resolve('T-RESUME-02', 1, 'RESUME')).toEqual({
      status: 'resolved',
      definition: templateRegistry.get('T-RESUME-02'),
    });
  });

  it('fails unsupported versions safely through a category fallback', () => {
    expect(templateRegistry.resolve('T-SOCIAL-02', 2, 'SOCIAL')).toEqual({
      status: 'fallback',
      definition: templateRegistry.get('T-SOCIAL-01'),
      reason: 'UNSUPPORTED_VERSION',
    });
  });

  it('uses category-safe fallbacks for unknown IDs and category mismatches', () => {
    expect(templateRegistry.resolve('T-SOCIAL-99', 1, 'RESUME')).toEqual({
      status: 'fallback',
      definition: templateRegistry.get('T-RESUME-01'),
      reason: 'UNKNOWN_TEMPLATE',
    });
    expect(templateRegistry.resolve('T-SOCIAL-02', 1, 'RESUME')).toEqual({
      status: 'fallback',
      definition: templateRegistry.get('T-RESUME-01'),
      reason: 'CATEGORY_MISMATCH',
    });
  });

  it('rejects duplicate registration', () => {
    const registrations = createRegistrations();
    registrations[5] = registrations[0] as TemplateRegistryEntry;

    expect(() => createTemplateRegistry(registrations)).toThrow(/duplicate/u);
  });

  it('rejects malformed registration and invalid category', () => {
    const malformed = createRegistrations();
    malformed[1] = {
      ...malformed[1],
      definition: {
        ...malformed[1]?.definition,
        category: 'PROFILE',
      },
    } as unknown as TemplateRegistryEntry;

    expect(() => createTemplateRegistry(malformed)).toThrow();
  });

  it('rejects missing registrations and invalid fallback bindings', () => {
    expect(() => createProductionTemplateRegistry(createRegistrations().slice(0, 5))).toThrow(
      /exactly six/u,
    );

    const invalidFallback = createRegistrations().map((entry) => ({
      ...entry,
      isCategoryFallback:
        entry.definition.templateId === 'T-SOCIAL-01' ||
        entry.definition.templateId === 'T-SOCIAL-02' ||
        entry.definition.templateId === 'T-RESUME-01',
    }));

    expect(() => createTemplateRegistry(invalidFallback)).toThrow(/fallback/u);
  });

  it('keeps production completeness separate from generic registry validity', () => {
    const reordered = createRegistrations();
    [reordered[0], reordered[1]] = [
      reordered[1] as TemplateRegistryEntry,
      reordered[0] as TemplateRegistryEntry,
    ];

    expect(() => createTemplateRegistry(reordered)).not.toThrow();
    expect(() => createProductionTemplateRegistry(reordered)).toThrow(/IDs or order/u);

    const alternateGenericFallback = createRegistrations().map((entry) => ({
      ...entry,
      isCategoryFallback:
        entry.definition.templateId === 'T-SOCIAL-02' ||
        entry.definition.templateId === 'T-RESUME-01',
    }));

    expect(() => createTemplateRegistry(alternateGenericFallback)).not.toThrow();
    expect(() => createProductionTemplateRegistry(alternateGenericFallback)).toThrow(
      /invalid SOCIAL fallback/u,
    );
  });
});
