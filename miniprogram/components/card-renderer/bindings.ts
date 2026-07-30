import type { TemplateId } from '../../templates';

export const RENDERER_KEYS = [
  'apple-minimal',
  'magazine',
  'scrapbook',
  'anime-role',
  'professional',
  'project-portfolio',
] as const;

export type RendererKey = (typeof RENDERER_KEYS)[number];

export const RENDERER_BINDINGS: Readonly<Record<TemplateId, RendererKey>> = {
  'T-SOCIAL-01': 'apple-minimal',
  'T-SOCIAL-02': 'magazine',
  'T-SOCIAL-03': 'scrapbook',
  'T-SOCIAL-04': 'anime-role',
  'T-RESUME-01': 'professional',
  'T-RESUME-02': 'project-portfolio',
};

export function resolveRendererKey(templateId: TemplateId): RendererKey | undefined {
  return RENDERER_BINDINGS[templateId];
}
