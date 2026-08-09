import {
  createTemplateSelectionHandoff,
  resolveLaunchTemplate,
  type LaunchTemplateEntry,
  type LaunchTemplateFailureReason,
  type TemplateSelectionHandoff,
} from '../../product/launch-templates';
import { getLaunchPreviewModel } from '../../product/launch-preview-models';
import type { RenderModel } from '../../templates/index';

interface PreviewRouteOptions {
  readonly templateId?: string;
  readonly templateVersion?: string;
}

interface PreviewFailureView {
  readonly previewState: LaunchTemplateFailureReason | 'RENDER_FAILURE';
  readonly stateTitle: string;
  readonly stateMessage: string;
}

function createFailureView(
  reason: LaunchTemplateFailureReason | 'RENDER_FAILURE',
): PreviewFailureView {
  if (reason === 'DEFERRED_TEMPLATE') {
    return {
      previewState: reason,
      stateTitle: '这个模板暂未开放',
      stateMessage: '请返回模板列表选择当前可用的模板。',
    };
  }

  if (reason === 'UNSUPPORTED_VERSION') {
    return {
      previewState: reason,
      stateTitle: '模板版本暂不可用',
      stateMessage: '请返回模板列表重新进入预览。',
    };
  }

  if (reason === 'RENDER_FAILURE') {
    return {
      previewState: reason,
      stateTitle: '模板暂时无法显示',
      stateMessage: '请返回模板列表选择其他模板。',
    };
  }

  return {
    previewState: reason,
    stateTitle: '模板不存在',
    stateMessage: '请返回模板列表选择可用的模板。',
  };
}

Page({
  data: {
    previewState: 'INVALID_TEMPLATE' as PreviewFailureView['previewState'] | 'READY',
    stateTitle: '',
    stateMessage: '',
    entry: null as LaunchTemplateEntry | null,
    previewModel: null as RenderModel | null,
    selectionConfirmed: false,
    selectionTitle: '',
    selectionHandoff: null as TemplateSelectionHandoff | null,
  },
  onLoad(options: PreviewRouteOptions) {
    const resolution = resolveLaunchTemplate(options.templateId, options.templateVersion);

    if (resolution.status === 'failure') {
      this.setData(createFailureView(resolution.reason));
      return;
    }

    const previewModel = getLaunchPreviewModel(resolution.entry.templateId);

    if (!previewModel) {
      this.setData(createFailureView('RENDER_FAILURE'));
      return;
    }

    this.setData({
      previewState: 'READY',
      stateTitle: '',
      stateMessage: '',
      entry: resolution.entry,
      previewModel,
      selectionConfirmed: false,
      selectionTitle: '',
      selectionHandoff: null,
    });
  },
  onSelectTemplate() {
    if (this.data.previewState !== 'READY' || !this.data.entry) {
      return;
    }

    const result = createTemplateSelectionHandoff(
      this.data.entry.templateId,
      this.data.entry.templateVersion,
    );

    if (result.status === 'invalid') {
      this.setData(createFailureView(result.reason));
      return;
    }

    this.setData({
      selectionConfirmed: true,
      selectionTitle: `已选择 ${this.data.entry.display.name}`,
      selectionHandoff: result.handoff,
    });
  },
});
