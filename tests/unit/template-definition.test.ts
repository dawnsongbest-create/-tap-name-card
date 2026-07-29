import { describe, expect, it } from 'vitest';

import {
  STABLE_TEMPLATE_IDS,
  parseTemplateDefinition,
  type TemplateDefinition,
  type TemplateId,
} from '../../miniprogram/templates/domain';
import {
  ANIME_ROLE_TEMPLATE,
  APPLE_MINIMAL_TEMPLATE,
  MAGAZINE_TEMPLATE,
  PROFESSIONAL_TEMPLATE,
  PROJECT_PORTFOLIO_TEMPLATE,
  SCRAPBOOK_TEMPLATE,
} from '../../miniprogram/templates/definitions';

const DEFINITIONS: readonly TemplateDefinition[] = [
  APPLE_MINIMAL_TEMPLATE,
  MAGAZINE_TEMPLATE,
  SCRAPBOOK_TEMPLATE,
  ANIME_ROLE_TEMPLATE,
  PROFESSIONAL_TEMPLATE,
  PROJECT_PORTFOLIO_TEMPLATE,
];

const EXPECTED_MODULE_CONSUMERS: Readonly<Record<TemplateId, readonly string[]>> = {
  'T-SOCIAL-01': ['CURRENT_STATUS'],
  'T-SOCIAL-02': ['PHOTO_GALLERY', 'BIO'],
  'T-SOCIAL-03': ['PHOTO_GALLERY', 'RECENT_LIKES'],
  'T-SOCIAL-04': ['LONG_TERM_INTERESTS', 'WATCHING', 'WANT_TO_TALK'],
  'T-RESUME-01': ['CURRENT_ROLE', 'CORE_SKILLS', 'CURRENT_GOAL'],
  'T-RESUME-02': ['PROJECTS', 'PORTFOLIO_LINKS'],
};

describe('M2.1-A template definitions', () => {
  it('defines exactly the six stable templates in their approved order', () => {
    expect(DEFINITIONS).toHaveLength(6);
    expect(DEFINITIONS.map((definition) => definition.templateId)).toEqual(STABLE_TEMPLATE_IDS);
    expect(new Set(DEFINITIONS.map((definition) => definition.templateId)).size).toBe(6);
  });

  it('contains four SOCIAL and two RESUME definitions with v1 contracts', () => {
    expect(DEFINITIONS.filter((definition) => definition.category === 'SOCIAL')).toHaveLength(4);
    expect(DEFINITIONS.filter((definition) => definition.category === 'RESUME')).toHaveLength(2);

    for (const definition of DEFINITIONS) {
      expect(parseTemplateDefinition(definition)).toEqual(definition);
      expect(definition.templateSchemaVersion).toBe(1);
      expect(definition.templateVersion).toBe(1);
    }
  });

  it('uses the canonical PRD names', () => {
    expect(DEFINITIONS.map((definition) => definition.display.name)).toEqual([
      'Apple Minimal',
      '杂志人物页',
      '手账拼贴',
      '动漫角色卡',
      '极简职业卡',
      '项目作品卡',
    ]);
  });

  it('requires the Professional current goal defined by the PRD', () => {
    expect(PROFESSIONAL_TEMPLATE.moduleCapabilities.required).toContain('CURRENT_GOAL');
    expect(PROFESSIONAL_TEMPLATE.moduleCapabilities.optional).not.toContain('CURRENT_GOAL');
  });

  it('declares only module capabilities with a named six-template consumer', () => {
    for (const definition of DEFINITIONS) {
      expect(definition.moduleCapabilities.supported).toEqual(
        EXPECTED_MODULE_CONSUMERS[definition.templateId],
      );
      expect(
        new Set([
          ...definition.moduleCapabilities.required,
          ...definition.moduleCapabilities.optional,
        ]),
      ).toEqual(new Set(definition.moduleCapabilities.supported));
    }
  });

  it('projects domain fields without leaking client implementation metadata', () => {
    const parsed = parseTemplateDefinition({
      ...APPLE_MINIMAL_TEMPLATE,
      rendererKey: 'future-renderer',
      fixtureKey: 'preview-fixture',
      assetManifest: ['preview.png'],
      wxmlPath: '/components/template.wxml',
      display: {
        ...APPLE_MINIMAL_TEMPLATE.display,
        thumbnailAsset: '/assets/preview.png',
      },
    });

    expect(parsed).toEqual(APPLE_MINIMAL_TEMPLATE);
    expect(parsed).not.toHaveProperty('rendererKey');
    expect(parsed).not.toHaveProperty('fixtureKey');
    expect(parsed).not.toHaveProperty('assetManifest');
    expect(parsed).not.toHaveProperty('wxmlPath');
    expect(parsed.display).not.toHaveProperty('thumbnailAsset');
  });

  it.each([
    ['unsupported schema version', { ...APPLE_MINIMAL_TEMPLATE, templateSchemaVersion: 2 }],
    ['unsupported template version', { ...APPLE_MINIMAL_TEMPLATE, templateVersion: 2 }],
    ['invalid category', { ...APPLE_MINIMAL_TEMPLATE, category: 'PROFILE' }],
    ['ID/category mismatch', { ...APPLE_MINIMAL_TEMPLATE, category: 'RESUME' }],
    [
      'unclassified supported module',
      {
        ...APPLE_MINIMAL_TEMPLATE,
        moduleCapabilities: {
          supported: ['CURRENT_STATUS', 'BIO'],
          required: [],
          optional: ['CURRENT_STATUS'],
        },
      },
    ],
    [
      'overlapping required and optional modules',
      {
        ...APPLE_MINIMAL_TEMPLATE,
        moduleCapabilities: {
          supported: ['CURRENT_STATUS'],
          required: ['CURRENT_STATUS'],
          optional: ['CURRENT_STATUS'],
        },
      },
    ],
    [
      'unsupported module declaration',
      {
        ...APPLE_MINIMAL_TEMPLATE,
        moduleCapabilities: {
          supported: ['PLUGIN_WIDGET'],
          required: [],
          optional: ['PLUGIN_WIDGET'],
        },
      },
    ],
  ])('rejects %s', (_label, definition) => {
    expect(() => parseTemplateDefinition(definition)).toThrow();
  });
});
