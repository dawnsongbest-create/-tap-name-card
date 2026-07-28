import { SAFE_ERROR_MESSAGES } from '../../shared/errors/error-code';

export type PageStateKind =
  'ready' | 'loading' | 'empty' | 'network-error' | 'forbidden' | 'not-found' | 'unavailable';

export interface PageStateViewModel {
  kind: PageStateKind;
  title: string;
  message: string;
  isError: boolean;
  showRetry: boolean;
}

const PAGE_STATE_MODELS: Readonly<Record<PageStateKind, PageStateViewModel>> = {
  ready: {
    kind: 'ready',
    title: '内容已准备好',
    message: '正常内容由页面负责展示。',
    isError: false,
    showRetry: false,
  },
  loading: {
    kind: 'loading',
    title: '正在加载',
    message: '请稍候，正在读取内容。',
    isError: false,
    showRetry: false,
  },
  empty: {
    kind: 'empty',
    title: '这里还是空的',
    message: '暂时没有可以显示的内容。',
    isError: false,
    showRetry: false,
  },
  'network-error': {
    kind: 'network-error',
    title: '网络不太稳定',
    message: SAFE_ERROR_MESSAGES.NETWORK_ERROR,
    isError: true,
    showRetry: true,
  },
  forbidden: {
    kind: 'forbidden',
    title: '暂时无法访问',
    message: SAFE_ERROR_MESSAGES.FORBIDDEN,
    isError: true,
    showRetry: false,
  },
  'not-found': {
    kind: 'not-found',
    title: '内容不存在',
    message: SAFE_ERROR_MESSAGES.RESOURCE_NOT_FOUND,
    isError: true,
    showRetry: false,
  },
  unavailable: {
    kind: 'unavailable',
    title: '服务暂时不可用',
    message: SAFE_ERROR_MESSAGES.SERVICE_UNAVAILABLE,
    isError: true,
    showRetry: true,
  },
};

const LEGACY_PAGE_STATE_MODELS: Readonly<Record<string, PageStateViewModel>> = {
  error: {
    ...PAGE_STATE_MODELS.unavailable,
    showRetry: false,
  },
  retry: PAGE_STATE_MODELS['network-error'],
};

const UNKNOWN_PAGE_STATE_MODEL: PageStateViewModel = {
  ...PAGE_STATE_MODELS.unavailable,
  showRetry: false,
};

export function isPageStateKind(kind: string): kind is PageStateKind {
  return Object.prototype.hasOwnProperty.call(PAGE_STATE_MODELS, kind);
}

export function getPageStateViewModel(kind: string): PageStateViewModel {
  if (isPageStateKind(kind)) {
    return PAGE_STATE_MODELS[kind];
  }

  return LEGACY_PAGE_STATE_MODELS[kind] ?? UNKNOWN_PAGE_STATE_MODEL;
}

export function emitPageStateRetryIntent(emit: (eventName: 'retry') => void): void {
  emit('retry');
}
