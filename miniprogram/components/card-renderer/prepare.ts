import {
  LIST_MODULE_TYPES,
  parseRenderModel,
  selectVisibleModules,
  templateRegistry,
  type RenderIdentity,
  type RenderModel,
  type RenderModule,
  type TemplateDefinition,
  type TemplateId,
  type TemplateModuleType,
} from '../../templates/index';
import type { ListRenderModule, TextRenderModule } from '../../templates/domain/module';
import { resolveRendererKey, type RendererKey } from './bindings';
import type {
  CapabilityIssue,
  CardRendererState,
  DomainInvalidFailure,
  PreparedCardRender,
  PreparedCardViewModel,
} from './model';

export interface RenderPreparationDependencies {
  readonly getDefinition: (templateId: TemplateId) => TemplateDefinition | undefined;
  readonly getRendererKey: (templateId: TemplateId) => RendererKey | undefined;
}

const DEFAULT_DEPENDENCIES: RenderPreparationDependencies = {
  getDefinition: (templateId) => templateRegistry.get(templateId),
  getRendererKey: resolveRendererKey,
};

export type ParsedCardRendererInput =
  | {
      readonly status: 'parsed';
      readonly model: RenderModel;
    }
  | {
      readonly status: 'failure';
      readonly failure: DomainInvalidFailure;
    };

export function parseCardRendererInput(raw: unknown): ParsedCardRendererInput {
  try {
    return {
      status: 'parsed',
      model: parseRenderModel(raw),
    };
  } catch {
    return {
      status: 'failure',
      failure: {
        kind: 'DOMAIN_INVALID',
        reason: 'INVALID_RENDER_MODEL',
      },
    };
  }
}

function isListRenderModule(module: RenderModule): module is ListRenderModule {
  return (LIST_MODULE_TYPES as readonly string[]).includes(module.moduleType);
}

function isTextRenderModule(module: RenderModule): module is TextRenderModule {
  return (
    module.moduleType === 'CURRENT_STATUS' ||
    module.moduleType === 'BIO' ||
    module.moduleType === 'CURRENT_ROLE' ||
    module.moduleType === 'CURRENT_GOAL'
  );
}

function isEffectiveModule(module: RenderModule): boolean {
  if (isListRenderModule(module)) {
    return module.content.items.length > 0;
  }

  if (
    module.moduleType === 'PHOTO_GALLERY' ||
    module.moduleType === 'PROJECTS' ||
    module.moduleType === 'PORTFOLIO_LINKS'
  ) {
    return module.content.items.length > 0;
  }

  return isTextRenderModule(module) && module.content.text.trim().length > 0;
}

function cloneIdentity(identity: RenderIdentity): RenderIdentity {
  return {
    displayName: identity.displayName,
    headline: identity.headline,
    tags: [...identity.tags],
    ...(identity.visual === undefined ? {} : { visual: { ...identity.visual } }),
  };
}

function cloneModule(module: RenderModule): RenderModule {
  if (isListRenderModule(module)) {
    return {
      ...module,
      content: {
        items: [...module.content.items],
      },
    };
  }

  if (module.moduleType === 'PHOTO_GALLERY') {
    return {
      ...module,
      content: {
        layout: module.content.layout,
        items: module.content.items.map((item) => ({ ...item })),
      },
    };
  }

  if (module.moduleType === 'PROJECTS') {
    return {
      ...module,
      content: {
        items: module.content.items.map((item) => ({ ...item })),
      },
    };
  }

  if (module.moduleType === 'PORTFOLIO_LINKS') {
    return {
      ...module,
      content: {
        items: module.content.items.map((item) => ({ ...item })),
      },
    };
  }

  if (isTextRenderModule(module)) {
    return {
      ...module,
      content: { ...module.content },
    };
  }

  return module;
}

function collectCapabilityIssues(
  model: RenderModel,
  definition: TemplateDefinition,
): readonly CapabilityIssue[] {
  const visibleModules = selectVisibleModules(model.modules);
  const supportedTypes = new Set(definition.moduleCapabilities.supported);
  const visibleByType = new Map<TemplateModuleType, RenderModule[]>();
  const issues: CapabilityIssue[] = [];

  for (const module of visibleModules) {
    const modulesOfType = visibleByType.get(module.moduleType) ?? [];
    modulesOfType.push(module);
    visibleByType.set(module.moduleType, modulesOfType);

    if (!supportedTypes.has(module.moduleType)) {
      issues.push({
        kind: 'UNSUPPORTED_VISIBLE_MODULE',
        moduleType: module.moduleType,
      });
    }
  }

  for (const [moduleType, modules] of visibleByType) {
    if (modules.length > 1) {
      issues.push({
        kind: 'DUPLICATE_VISIBLE_MODULE',
        moduleType,
      });
    }
  }

  for (const moduleType of definition.moduleCapabilities.required) {
    const modules = visibleByType.get(moduleType);

    if (!modules || modules.length === 0) {
      issues.push({
        kind: 'MISSING_REQUIRED_MODULE',
        moduleType,
      });
      continue;
    }

    if (modules.every((module) => !isEffectiveModule(module))) {
      issues.push({
        kind: 'EMPTY_REQUIRED_MODULE',
        moduleType,
      });
    }
  }

  return issues;
}

function buildPreparedViewModel(
  model: RenderModel,
  definition: TemplateDefinition,
): PreparedCardViewModel {
  const supportedTypes = new Set(definition.moduleCapabilities.supported);
  const modules = selectVisibleModules(model.modules)
    .filter((module) => supportedTypes.has(module.moduleType) && isEffectiveModule(module))
    .map(cloneModule);

  return {
    identity: cloneIdentity(model.identity),
    modules,
  };
}

export function prepareCardRender(
  model: RenderModel,
  dependencies: RenderPreparationDependencies = DEFAULT_DEPENDENCIES,
): CardRendererState {
  const definition = dependencies.getDefinition(model.templateId);

  if (!definition) {
    return {
      status: 'failure',
      failure: {
        kind: 'RESOLUTION_FAILURE',
        reason: 'UNKNOWN_TEMPLATE',
      },
    };
  }

  if (definition.category !== model.category) {
    return {
      status: 'failure',
      failure: {
        kind: 'RESOLUTION_FAILURE',
        reason: 'CATEGORY_MISMATCH',
      },
    };
  }

  if (definition.templateVersion !== model.templateVersion) {
    return {
      status: 'failure',
      failure: {
        kind: 'RESOLUTION_FAILURE',
        reason: 'UNSUPPORTED_VERSION',
      },
    };
  }

  const rendererKey = dependencies.getRendererKey(model.templateId);

  if (!rendererKey) {
    return {
      status: 'failure',
      failure: {
        kind: 'RESOLUTION_FAILURE',
        reason: 'MISSING_RENDERER_BINDING',
      },
    };
  }

  const issues = collectCapabilityIssues(model, definition);

  if (issues.length > 0) {
    return {
      status: 'failure',
      failure: {
        kind: 'CAPABILITY_INCOMPATIBLE',
        issues,
      },
    };
  }

  return {
    status: 'ready',
    templateId: model.templateId,
    category: model.category,
    rendererKey,
    viewModel: buildPreparedViewModel(model, definition),
  } satisfies PreparedCardRender;
}

export function createCardRendererState(
  raw: unknown,
  dependencies: RenderPreparationDependencies = DEFAULT_DEPENDENCIES,
): CardRendererState {
  const parsed = parseCardRendererInput(raw);

  if (parsed.status === 'failure') {
    return {
      status: 'failure',
      failure: parsed.failure,
    };
  }

  return prepareCardRender(parsed.model, dependencies);
}
