import type { TemplateModuleType } from './module';

export const TEMPLATE_SCHEMA_VERSION = 1 as const;
export const TEMPLATE_VERSION = 1 as const;

export const TEMPLATE_CATEGORIES = ['SOCIAL', 'RESUME'] as const;
export type TemplateCategory = (typeof TEMPLATE_CATEGORIES)[number];

export const TEMPLATE_EDITOR_LEVELS = ['L1', 'L2'] as const;
export type TemplateEditorLevel = (typeof TEMPLATE_EDITOR_LEVELS)[number];

export const STABLE_TEMPLATE_IDS = [
  'T-SOCIAL-01',
  'T-SOCIAL-02',
  'T-SOCIAL-03',
  'T-SOCIAL-04',
  'T-RESUME-01',
  'T-RESUME-02',
] as const;

export type TemplateId = (typeof STABLE_TEMPLATE_IDS)[number];

export const EXPECTED_TEMPLATE_CATEGORY: Readonly<Record<TemplateId, TemplateCategory>> = {
  'T-SOCIAL-01': 'SOCIAL',
  'T-SOCIAL-02': 'SOCIAL',
  'T-SOCIAL-03': 'SOCIAL',
  'T-SOCIAL-04': 'SOCIAL',
  'T-RESUME-01': 'RESUME',
  'T-RESUME-02': 'RESUME',
};

export interface TemplateDisplayMetadata {
  readonly name: string;
  readonly description: string;
  readonly positioning: string;
}

export interface TemplateModuleCapabilities {
  readonly supported: readonly TemplateModuleType[];
  readonly required: readonly TemplateModuleType[];
  readonly optional: readonly TemplateModuleType[];
}

export interface TemplateDefinition {
  readonly templateId: TemplateId;
  readonly templateSchemaVersion: typeof TEMPLATE_SCHEMA_VERSION;
  readonly templateVersion: typeof TEMPLATE_VERSION;
  readonly category: TemplateCategory;
  readonly display: TemplateDisplayMetadata;
  readonly editorLevel: TemplateEditorLevel;
  readonly moduleCapabilities: TemplateModuleCapabilities;
}
