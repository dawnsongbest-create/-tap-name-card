import { describe, expect, it } from 'vitest';

import {
  prepareCardRender,
  type RenderPreparationDependencies,
} from '../../miniprogram/components/card-renderer/prepare';
import type { RendererKey } from '../../miniprogram/components/card-renderer/bindings';
import {
  createRendererFixtureCandidate,
  type RendererFixtureScenario,
} from '../../miniprogram/templates/fixtures';
import {
  parseRenderModel,
  templateRegistry,
  type RenderModel,
  type RenderModule,
  type TemplateDefinition,
} from '../../miniprogram/templates';

function parseFixture(
  templateId: RenderModel['templateId'],
  scenario: RendererFixtureScenario = 'NORMAL',
): RenderModel {
  return parseRenderModel(createRendererFixtureCandidate(templateId, scenario));
}

function withModules(model: RenderModel, modules: readonly RenderModule[]): RenderModel {
  return parseRenderModel({
    ...model,
    modules,
  });
}

describe('M2.1-B1 exact resolution failures', () => {
  const model = parseFixture('T-SOCIAL-01');
  const definition = templateRegistry.get(model.templateId) as TemplateDefinition;
  const resolutionCases: ReadonlyArray<
    readonly [
      'UNKNOWN_TEMPLATE' | 'CATEGORY_MISMATCH' | 'UNSUPPORTED_VERSION' | 'MISSING_RENDERER_BINDING',
      RenderPreparationDependencies,
    ]
  > = [
    [
      'UNKNOWN_TEMPLATE',
      {
        getDefinition: (): TemplateDefinition | undefined => undefined,
        getRendererKey: (): RendererKey | undefined => 'apple-minimal',
      },
    ],
    [
      'CATEGORY_MISMATCH',
      {
        getDefinition: (): TemplateDefinition | undefined =>
          ({ ...definition, category: 'RESUME' }) as TemplateDefinition,
        getRendererKey: (): RendererKey | undefined => 'apple-minimal',
      },
    ],
    [
      'UNSUPPORTED_VERSION',
      {
        getDefinition: (): TemplateDefinition | undefined =>
          ({ ...definition, templateVersion: 2 }) as unknown as TemplateDefinition,
        getRendererKey: (): RendererKey | undefined => 'apple-minimal',
      },
    ],
    [
      'MISSING_RENDERER_BINDING',
      {
        getDefinition: (): TemplateDefinition | undefined => definition,
        getRendererKey: (): RendererKey | undefined => undefined,
      },
    ],
  ];

  it.each(resolutionCases)(
    'returns %s without best-effort renderer guessing',
    (reason, dependencies: RenderPreparationDependencies) => {
      expect(prepareCardRender(model, dependencies)).toEqual({
        status: 'failure',
        failure: {
          kind: 'RESOLUTION_FAILURE',
          reason,
        },
      });
    },
  );
});

describe('M2.1-B1 capability incompatibility', () => {
  const professional = parseFixture('T-RESUME-01');
  const role = professional.modules.find((module) => module.moduleType === 'CURRENT_ROLE');
  const skills = professional.modules.find((module) => module.moduleType === 'CORE_SKILLS');

  if (!role || !skills) {
    throw new Error('Professional fixture is incomplete.');
  }

  it('keeps required-missing data domain-valid but capability-incompatible', () => {
    const model = withModules(
      professional,
      professional.modules.filter((module) => module.moduleType !== 'CURRENT_ROLE'),
    );

    expect(prepareCardRender(model)).toEqual({
      status: 'failure',
      failure: {
        kind: 'CAPABILITY_INCOMPATIBLE',
        issues: [{ kind: 'MISSING_REQUIRED_MODULE', moduleType: 'CURRENT_ROLE' }],
      },
    });
  });

  it('treats a hidden required module as missing after visible filtering', () => {
    const model = withModules(
      professional,
      professional.modules.map((module) =>
        module.moduleType === 'CURRENT_ROLE' ? { ...module, visible: false } : module,
      ),
    );
    const result = prepareCardRender(model);

    expect(result).toMatchObject({
      status: 'failure',
      failure: {
        kind: 'CAPABILITY_INCOMPATIBLE',
        issues: [{ kind: 'MISSING_REQUIRED_MODULE', moduleType: 'CURRENT_ROLE' }],
      },
    });
  });

  it('rejects a visible globally-valid but template-unsupported module', () => {
    const model = withModules(professional, [
      ...professional.modules,
      {
        moduleId: 'bio',
        moduleType: 'BIO',
        visible: true,
        order: 3,
        content: { text: '合法领域模块，但当前模板不支持。' },
      },
    ]);
    const result = prepareCardRender(model);

    expect(result).toMatchObject({
      status: 'failure',
      failure: {
        kind: 'CAPABILITY_INCOMPATIBLE',
        issues: [{ kind: 'UNSUPPORTED_VISIBLE_MODULE', moduleType: 'BIO' }],
      },
    });
  });

  it('preserves a hidden unsupported module in RenderModel but omits it from PreparedCardViewModel', () => {
    const model = withModules(professional, [
      ...professional.modules,
      {
        moduleId: 'bio',
        moduleType: 'BIO',
        visible: false,
        order: 3,
        content: { text: '隐藏内容仍留在领域模型。' },
      },
    ]);
    const result = prepareCardRender(model);

    expect(result.status).toBe('ready');

    if (result.status === 'ready') {
      expect(model.modules.some((module) => module.moduleId === 'bio')).toBe(true);
      expect(result.viewModel.modules.some((module) => module.moduleId === 'bio')).toBe(false);
    }
  });

  it('rejects duplicate visible semantic modules with unique IDs and orders', () => {
    const model = withModules(professional, [
      ...professional.modules,
      {
        ...role,
        moduleId: 'role-secondary',
        order: 3,
      },
    ]);
    const result = prepareCardRender(model);

    expect(result).toMatchObject({
      status: 'failure',
      failure: {
        kind: 'CAPABILITY_INCOMPATIBLE',
        issues: [{ kind: 'DUPLICATE_VISIBLE_MODULE', moduleType: 'CURRENT_ROLE' }],
      },
    });
  });

  it('rejects required content that is domain-valid but empty after effective-content checking', () => {
    const model = parseRenderModel({
      ...professional,
      modules: professional.modules.map((module) =>
        module.moduleType === 'CORE_SKILLS'
          ? {
              ...skills,
              content: { items: [] },
            }
          : module,
      ),
    });
    const result = prepareCardRender(model);

    expect(result).toMatchObject({
      status: 'failure',
      failure: {
        kind: 'CAPABILITY_INCOMPATIBLE',
        issues: [{ kind: 'EMPTY_REQUIRED_MODULE', moduleType: 'CORE_SKILLS' }],
      },
    });
  });

  it('drops an empty optional module without redefining domain validity', () => {
    const scrapbook = parseFixture('T-SOCIAL-03');
    const model = parseRenderModel({
      ...scrapbook,
      modules: scrapbook.modules.map((module) =>
        module.moduleType === 'RECENT_LIKES'
          ? {
              ...module,
              content: { items: [] },
            }
          : module,
      ),
    });
    const result = prepareCardRender(model);

    expect(result.status).toBe('ready');

    if (result.status === 'ready') {
      expect(result.viewModel.modules.map((module) => module.moduleType)).toEqual([
        'PHOTO_GALLERY',
      ]);
    }
  });
});
