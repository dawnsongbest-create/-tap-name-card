import { describe, expect, it, vi } from 'vitest';

import {
  createCardRendererState,
  parseCardRendererInput,
  prepareCardRender,
  type RenderPreparationDependencies,
} from '../../miniprogram/components/card-renderer/prepare';
import { createCardRendererComponentData } from '../../miniprogram/components/card-renderer/component-data';
import {
  createRendererFixtureCandidate,
  type RendererFixtureScenario,
} from '../../miniprogram/templates/fixtures';
import { parseRenderModel, templateRegistry, type RenderModel } from '../../miniprogram/templates';

function parseFixture(
  templateId: RenderModel['templateId'],
  scenario: RendererFixtureScenario = 'NORMAL',
): RenderModel {
  return parseRenderModel(createRendererFixtureCandidate(templateId, scenario));
}

describe('M2.1-B1 card renderer preparation boundary', () => {
  it('separates domain-invalid raw input from the typed renderer pipeline', () => {
    const dependencies: RenderPreparationDependencies = {
      getDefinition: vi.fn(),
      getRendererKey: vi.fn(),
    };

    expect(createCardRendererState({ invalid: true }, dependencies)).toEqual({
      status: 'failure',
      failure: {
        kind: 'DOMAIN_INVALID',
        reason: 'INVALID_RENDER_MODEL',
      },
    });
    expect(dependencies.getDefinition).not.toHaveBeenCalled();
    expect(dependencies.getRendererKey).not.toHaveBeenCalled();
  });

  it('parses raw input once before preparing a typed RenderModel', () => {
    const candidate = createRendererFixtureCandidate('T-SOCIAL-01', 'NORMAL');
    const parsed = parseCardRendererInput(candidate);

    expect(parsed.status).toBe('parsed');

    if (parsed.status === 'parsed') {
      expect(prepareCardRender(parsed.model).status).toBe('ready');
    }
  });

  it('returns a renderer-neutral common safe presentation projection', () => {
    const result = prepareCardRender(parseFixture('T-SOCIAL-03'));

    expect(result.status).toBe('ready');

    if (result.status === 'ready') {
      expect(Object.keys(result.viewModel).sort()).toEqual(['identity', 'modules']);
      expect(result.viewModel).not.toHaveProperty('rendererKey');
      expect(result.viewModel).not.toHaveProperty('templateId');
      expect(result.viewModel).not.toHaveProperty('heroPosition');
      expect(result.viewModel).not.toHaveProperty('preferredRatio');
      expect(result.viewModel).not.toHaveProperty('layout');
      expect(result.viewModel).not.toHaveProperty('decorativeCoordinates');
      expect(JSON.stringify(result.viewModel)).not.toMatch(
        /heroPosition|preferredRatio|tapeRotation|panelLayout|columnLayout/u,
      );
    }
  });

  it('is pure and deterministic for the same parsed model and dependencies', () => {
    const model = parseFixture('T-RESUME-02', 'LONG_TEXT');
    const definition = templateRegistry.get(model.templateId);
    const dependencies: RenderPreparationDependencies = {
      getDefinition: () => definition,
      getRendererKey: () => 'project-portfolio',
    };

    const first = prepareCardRender(model, dependencies);
    const second = prepareCardRender(model, dependencies);

    expect(first).toEqual(second);
    expect(model).toEqual(parseFixture('T-RESUME-02', 'LONG_TEXT'));
  });

  it('copies safe identity and modules instead of sharing mutable presentation arrays', () => {
    const model = parseFixture('T-SOCIAL-04');
    const result = prepareCardRender(model);

    expect(result.status).toBe('ready');

    if (result.status === 'ready') {
      expect(result.viewModel.identity).not.toBe(model.identity);
      expect(result.viewModel.identity.tags).not.toBe(model.identity.tags);
      expect(result.viewModel.modules).not.toBe(model.modules);
      expect(result.viewModel.modules[0]).not.toBe(model.modules[0]);
    }
  });

  it('clears ready-only component fields when a later input fails', () => {
    const ready = createCardRendererComponentData(
      createRendererFixtureCandidate('T-SOCIAL-01', 'NORMAL'),
    );
    const failure = createCardRendererComponentData({ invalid: true });

    expect(ready.status).toBe('ready');
    expect(failure).toEqual({
      status: 'failure',
      rendererKey: '',
      viewModel: null,
    });
  });
});
