import type {
  RenderIdentity,
  RenderModule,
  TemplateCategory,
  TemplateId,
  TemplateModuleType,
} from '../../templates';
import type { RendererKey } from './bindings';

export interface PreparedCardViewModel {
  readonly identity: RenderIdentity;
  readonly modules: readonly RenderModule[];
}

export type DomainInvalidFailure = {
  readonly kind: 'DOMAIN_INVALID';
  readonly reason: 'INVALID_RENDER_MODEL';
};

export type RendererResolutionFailure = {
  readonly kind: 'RESOLUTION_FAILURE';
  readonly reason:
    'UNKNOWN_TEMPLATE' | 'CATEGORY_MISMATCH' | 'UNSUPPORTED_VERSION' | 'MISSING_RENDERER_BINDING';
};

export type CapabilityIssue =
  | {
      readonly kind: 'MISSING_REQUIRED_MODULE';
      readonly moduleType: TemplateModuleType;
    }
  | {
      readonly kind: 'UNSUPPORTED_VISIBLE_MODULE';
      readonly moduleType: TemplateModuleType;
    }
  | {
      readonly kind: 'DUPLICATE_VISIBLE_MODULE';
      readonly moduleType: TemplateModuleType;
    }
  | {
      readonly kind: 'EMPTY_REQUIRED_MODULE';
      readonly moduleType: TemplateModuleType;
    };

export type CapabilityIncompatibleFailure = {
  readonly kind: 'CAPABILITY_INCOMPATIBLE';
  readonly issues: readonly CapabilityIssue[];
};

export type CardRenderFailure =
  DomainInvalidFailure | RendererResolutionFailure | CapabilityIncompatibleFailure;

export type PreparedCardRender = {
  readonly status: 'ready';
  readonly templateId: TemplateId;
  readonly category: TemplateCategory;
  readonly rendererKey: RendererKey;
  readonly viewModel: PreparedCardViewModel;
};

export type CardRendererState =
  | PreparedCardRender
  | {
      readonly status: 'failure';
      readonly failure: CardRenderFailure;
    };
