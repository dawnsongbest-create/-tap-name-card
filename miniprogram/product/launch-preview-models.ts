import type { RenderModel } from '../templates/index';
import { isLaunchTemplateId, type LaunchTemplateId } from './launch-templates';

const APPLE_MINIMAL_PREVIEW = {
  renderModelVersion: 1,
  templateId: 'T-SOCIAL-01',
  templateVersion: 1,
  category: 'SOCIAL',
  identity: {
    displayName: '林岚',
    headline: '慢热，但遇到喜欢的话题会说很多。',
    tags: ['城市散步', '独立音乐', '胶片摄影'],
    visual: {
      kind: 'IMAGE',
      value: '/assets/templates/fixture-social-identity.jpg',
      altText: '阳光落在浅色石材和金属结构上的建筑光影',
    },
  },
  modules: [
    {
      moduleId: 'status',
      moduleType: 'CURRENT_STATUS',
      visible: true,
      order: 0,
      content: {
        text: '最近在学习胶片摄影。',
      },
    },
  ],
} as const satisfies RenderModel;

const MAGAZINE_PREVIEW = {
  renderModelVersion: 1,
  templateId: 'T-SOCIAL-02',
  templateVersion: 1,
  category: 'SOCIAL',
  identity: {
    displayName: '林岚',
    headline: '在城市里收集光、声音和偶然遇见的故事。',
    tags: ['城市观察', '现场音乐', '影像记录'],
    visual: {
      kind: 'IMAGE',
      value: '/assets/templates/fixture-social-identity.jpg',
      altText: '阳光落在浅色石材和金属结构上的建筑光影',
    },
  },
  modules: [
    {
      moduleId: 'gallery',
      moduleType: 'PHOTO_GALLERY',
      visible: true,
      order: 0,
      content: {
        layout: 'TWO',
        items: [
          {
            imageRef: '/assets/templates/fixture-magazine-hero.jpg',
            caption: '周末街区散步',
            altText: '日光穿过展览空间入口形成安静的建筑光影',
          },
          {
            imageRef: '/assets/templates/fixture-social-identity.jpg',
            caption: '展览入口',
            altText: '阳光落在浅色石材和金属结构上的建筑光影',
          },
        ],
      },
    },
    {
      moduleId: 'bio',
      moduleType: 'BIO',
      visible: true,
      order: 1,
      content: {
        text: '喜欢记录城市里不起眼的角落，也喜欢听别人讲最近真正投入的事情。',
      },
    },
  ],
} as const satisfies RenderModel;

const LAUNCH_PREVIEW_MODELS: Readonly<Record<LaunchTemplateId, RenderModel>> = {
  'T-SOCIAL-01': APPLE_MINIMAL_PREVIEW,
  'T-SOCIAL-02': MAGAZINE_PREVIEW,
};

export function getLaunchPreviewModel(templateId: unknown): RenderModel | undefined {
  return isLaunchTemplateId(templateId) ? LAUNCH_PREVIEW_MODELS[templateId] : undefined;
}
