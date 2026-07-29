import type { RenderModule } from './module';
import type { TemplateCategory, TemplateId } from './template-definition';

export const RENDER_MODEL_VERSION = 1 as const;

export const RENDER_VISUAL_KINDS = ['IMAGE', 'SYMBOL', 'EMOJI', 'TEXT', 'DEFAULT_GRAPHIC'] as const;

export type RenderVisualKind = (typeof RENDER_VISUAL_KINDS)[number];

export interface RenderVisual {
  readonly kind: RenderVisualKind;
  readonly value?: string;
  readonly altText?: string;
}

export interface RenderIdentity {
  readonly displayName: string;
  readonly headline: string;
  readonly tags: readonly string[];
  readonly visual?: RenderVisual;
}

export interface RenderModel {
  readonly renderModelVersion: typeof RENDER_MODEL_VERSION;
  readonly templateId: TemplateId;
  readonly templateVersion: 1;
  readonly category: TemplateCategory;
  readonly identity: RenderIdentity;
  readonly modules: readonly RenderModule[];
}
