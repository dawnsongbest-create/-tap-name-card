export type PageStateKind = 'loading' | 'empty' | 'error' | 'retry' | 'ready';

export interface PageStateViewModel {
  kind: PageStateKind;
  title: string;
  message: string;
  showRetry: boolean;
}

const PAGE_STATE_MODELS: Readonly<Record<PageStateKind, PageStateViewModel>> = {
  loading: {
    kind: 'loading',
    title: '正在加载',
    message: '基础状态组件正在等待数据。',
    showRetry: false,
  },
  empty: {
    kind: 'empty',
    title: '这里还是空的',
    message: '空状态需要说明原因和下一步。',
    showRetry: false,
  },
  error: {
    kind: 'error',
    title: '暂时没有完成',
    message: '错误状态不会展示内部异常。',
    showRetry: false,
  },
  retry: {
    kind: 'retry',
    title: '可以重新试一次',
    message: '重试操作由页面处理，组件只传递用户意图。',
    showRetry: true,
  },
  ready: {
    kind: 'ready',
    title: '内容已准备好',
    message: '正常状态由页面内容负责展示。',
    showRetry: false,
  },
};

export function isPageStateKind(kind: string): kind is PageStateKind {
  return Object.prototype.hasOwnProperty.call(PAGE_STATE_MODELS, kind);
}

export function getPageStateViewModel(kind: string): PageStateViewModel {
  return isPageStateKind(kind) ? PAGE_STATE_MODELS[kind] : PAGE_STATE_MODELS.error;
}
