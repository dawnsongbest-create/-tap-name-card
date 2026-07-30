import {
  RENDERER_FIXTURE_SCENARIOS,
  createRendererFixtureCandidate,
  isRendererFixtureScenario,
  type RendererFixtureScenario,
} from '../../templates/fixtures/index';
import { STABLE_TEMPLATE_IDS, type TemplateId } from '../../templates/index';

export const RENDERER_LAB_TEMPLATE_IDS = [...STABLE_TEMPLATE_IDS] as const;
export const RENDERER_LAB_SCENARIOS = [...RENDERER_FIXTURE_SCENARIOS] as const;

export interface RendererLabSelection {
  readonly templateId: TemplateId;
  readonly scenario: RendererFixtureScenario;
}

export const INITIAL_RENDERER_LAB_SELECTION: RendererLabSelection = {
  templateId: 'T-SOCIAL-01',
  scenario: 'NORMAL',
};

export function isRendererLabTemplateId(value: unknown): value is TemplateId {
  return (
    typeof value === 'string' && (RENDERER_LAB_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

export function readRendererLabSelection(
  templateId: unknown,
  scenario: unknown,
): RendererLabSelection | undefined {
  if (!isRendererLabTemplateId(templateId) || !isRendererFixtureScenario(scenario)) {
    return undefined;
  }

  return { templateId, scenario };
}

export function createRendererLabModel(selection: RendererLabSelection): unknown {
  return createRendererFixtureCandidate(selection.templateId, selection.scenario);
}
