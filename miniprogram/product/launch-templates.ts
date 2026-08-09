import {
  STABLE_TEMPLATE_IDS,
  templateRegistry,
  type TemplateCategory,
  type TemplateDefinition,
} from '../templates/index';

export const LAUNCH_TEMPLATE_IDS = ['T-SOCIAL-01', 'T-SOCIAL-02'] as const;

export type LaunchTemplateId = (typeof LAUNCH_TEMPLATE_IDS)[number];

export interface LaunchTemplateEntry {
  readonly templateId: LaunchTemplateId;
  readonly templateVersion: 1;
  readonly category: TemplateCategory;
  readonly display: TemplateDefinition['display'];
}

export interface TemplateSelectionHandoff {
  readonly templateId: LaunchTemplateId;
  readonly templateVersion: 1;
}

export type LaunchTemplateFailureReason =
  'INVALID_TEMPLATE' | 'DEFERRED_TEMPLATE' | 'UNSUPPORTED_VERSION';

export type LaunchTemplateResolution =
  | {
      readonly status: 'ready';
      readonly entry: LaunchTemplateEntry;
    }
  | {
      readonly status: 'failure';
      readonly reason: LaunchTemplateFailureReason;
    };

export type TemplateSelectionResult =
  | {
      readonly status: 'valid';
      readonly handoff: TemplateSelectionHandoff;
    }
  | {
      readonly status: 'invalid';
      readonly reason: LaunchTemplateFailureReason;
    };

function isStableTemplateId(value: unknown): value is (typeof STABLE_TEMPLATE_IDS)[number] {
  return typeof value === 'string' && (STABLE_TEMPLATE_IDS as readonly string[]).includes(value);
}

export function isLaunchTemplateId(value: unknown): value is LaunchTemplateId {
  return typeof value === 'string' && (LAUNCH_TEMPLATE_IDS as readonly string[]).includes(value);
}

function createLaunchCatalog(): readonly LaunchTemplateEntry[] {
  const entries = LAUNCH_TEMPLATE_IDS.map((templateId) => {
    const definition = templateRegistry.get(templateId);

    if (!definition || definition.templateId !== templateId) {
      return undefined;
    }

    return {
      templateId,
      templateVersion: definition.templateVersion,
      category: definition.category,
      display: {
        name: definition.display.name,
        description: definition.display.description,
        positioning: definition.display.positioning,
      },
    } satisfies LaunchTemplateEntry;
  });

  return entries.every((entry): entry is LaunchTemplateEntry => entry !== undefined) ? entries : [];
}

const LAUNCH_CATALOG = createLaunchCatalog();

export function getLaunchCatalog(): readonly LaunchTemplateEntry[] {
  return LAUNCH_CATALOG.map((entry) => ({
    ...entry,
    display: { ...entry.display },
  }));
}

function readTemplateVersion(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/u.test(value)) {
    return Number(value);
  }

  return undefined;
}

export function resolveLaunchTemplate(
  templateId: unknown,
  templateVersion: unknown,
): LaunchTemplateResolution {
  if (!isStableTemplateId(templateId)) {
    return { status: 'failure', reason: 'INVALID_TEMPLATE' };
  }

  if (!isLaunchTemplateId(templateId)) {
    return { status: 'failure', reason: 'DEFERRED_TEMPLATE' };
  }

  const entry = LAUNCH_CATALOG.find((candidate) => candidate.templateId === templateId);

  if (!entry) {
    return { status: 'failure', reason: 'INVALID_TEMPLATE' };
  }

  if (readTemplateVersion(templateVersion) !== entry.templateVersion) {
    return { status: 'failure', reason: 'UNSUPPORTED_VERSION' };
  }

  return {
    status: 'ready',
    entry: {
      ...entry,
      display: { ...entry.display },
    },
  };
}

export function createTemplateSelectionHandoff(
  templateId: unknown,
  templateVersion: unknown,
): TemplateSelectionResult {
  const resolution = resolveLaunchTemplate(templateId, templateVersion);

  if (resolution.status === 'failure') {
    return {
      status: 'invalid',
      reason: resolution.reason,
    };
  }

  return {
    status: 'valid',
    handoff: {
      templateId: resolution.entry.templateId,
      templateVersion: resolution.entry.templateVersion,
    },
  };
}

export function buildTemplatePreviewUrl(entry: LaunchTemplateEntry): string {
  return `/pages/template-preview/index?templateId=${encodeURIComponent(entry.templateId)}&templateVersion=${entry.templateVersion}`;
}
