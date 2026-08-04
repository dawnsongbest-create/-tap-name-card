import type { PreparedCardViewModel } from '../../model';

export type AppleMinimalVisualKind = '' | 'IMAGE' | 'SYMBOL' | 'EMOJI' | 'TEXT' | 'DEFAULT_GRAPHIC';

export type AppleMinimalNameScale = 'short' | 'long' | 'extra-long';

export interface AppleMinimalPresentation {
  readonly hasVisual: boolean;
  readonly visualKind: AppleMinimalVisualKind;
  readonly visualValue: string;
  readonly visualAltText: string;
  readonly nameScale: AppleMinimalNameScale;
  readonly tagsText: string;
  readonly hasStatus: boolean;
  readonly statusText: string;
}

function getNameScale(displayName: string): AppleMinimalNameScale {
  const length = Array.from(displayName.trim()).length;

  if (length <= 8) {
    return 'short';
  }

  if (length <= 18) {
    return 'long';
  }

  return 'extra-long';
}

function getStatusText(model: PreparedCardViewModel): string {
  const statusModule = model.modules.find((module) => module.moduleType === 'CURRENT_STATUS');

  if (!statusModule || !('text' in statusModule.content)) {
    return '';
  }

  return statusModule.content.text;
}

export function createAppleMinimalPresentation(
  model: PreparedCardViewModel | null,
): AppleMinimalPresentation {
  if (!model) {
    return {
      hasVisual: false,
      visualKind: '',
      visualValue: '',
      visualAltText: '',
      nameScale: 'short',
      tagsText: '',
      hasStatus: false,
      statusText: '',
    };
  }

  const visual = model.identity.visual;
  const statusText = getStatusText(model);

  return {
    hasVisual: visual !== undefined,
    visualKind: visual?.kind ?? '',
    visualValue: visual?.value ?? '',
    visualAltText: visual?.altText ?? '',
    nameScale: getNameScale(model.identity.displayName),
    tagsText: model.identity.tags.join(' · '),
    hasStatus: statusText.length > 0,
    statusText,
  };
}
