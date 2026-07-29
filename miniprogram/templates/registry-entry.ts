import type { TemplateDefinition } from './domain/template-definition';

export interface TemplateRegistryEntry {
  readonly definition: TemplateDefinition;
  readonly isCategoryFallback: boolean;
}
