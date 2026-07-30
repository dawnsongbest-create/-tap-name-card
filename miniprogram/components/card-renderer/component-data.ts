import { createCardRendererState } from './prepare';
import type { RendererKey } from './bindings';
import type { PreparedCardViewModel } from './model';

export interface CardRendererComponentData {
  readonly status: 'ready' | 'failure';
  readonly rendererKey: RendererKey | '';
  readonly viewModel: PreparedCardViewModel | null;
}

export function createCardRendererComponentData(raw: unknown): CardRendererComponentData {
  const state = createCardRendererState(raw);

  if (state.status === 'failure') {
    return {
      status: 'failure',
      rendererKey: '',
      viewModel: null,
    };
  }

  return {
    status: 'ready',
    rendererKey: state.rendererKey,
    viewModel: state.viewModel,
  };
}
