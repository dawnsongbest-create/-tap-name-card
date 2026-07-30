import { describe, expect, it } from 'vitest';

import {
  parseRenderModel,
  parseRenderModule,
  selectVisibleModules,
  type RenderModel,
  type RenderModule,
} from '../../miniprogram/templates/domain';

const MINIMAL_MODEL = {
  renderModelVersion: 1,
  templateId: 'T-SOCIAL-01',
  templateVersion: 1,
  category: 'SOCIAL',
  identity: {
    displayName: '小岚',
    headline: '慢热，但遇到喜欢的话题会说很多。',
    tags: ['城市散步', '独立音乐'],
    visual: {
      kind: 'DEFAULT_GRAPHIC',
      altText: '抽象圆形图案',
    },
  },
  modules: [
    {
      moduleId: 'status',
      moduleType: 'CURRENT_STATUS',
      visible: true,
      order: 0,
      content: { text: '最近在学习胶片摄影。' },
    },
  ],
} as const;

const SUPPORTED_MODULES: readonly unknown[] = [
  {
    moduleId: 'status',
    moduleType: 'CURRENT_STATUS',
    visible: true,
    order: 0,
    content: { text: '准备周末散步。' },
  },
  {
    moduleId: 'bio',
    moduleType: 'BIO',
    visible: true,
    order: 1,
    content: { text: '喜欢记录城市里不起眼的角落。' },
  },
  {
    moduleId: 'role',
    moduleType: 'CURRENT_ROLE',
    visible: true,
    order: 2,
    content: { text: '独立产品设计师' },
  },
  {
    moduleId: 'goal',
    moduleType: 'CURRENT_GOAL',
    visible: false,
    order: 3,
    content: { text: '寻找长期合作项目' },
  },
  {
    moduleId: 'likes',
    moduleType: 'RECENT_LIKES',
    visible: true,
    order: 4,
    content: { items: ['旧书店', '现场演出'] },
  },
  {
    moduleId: 'interests',
    moduleType: 'LONG_TERM_INTERESTS',
    visible: true,
    order: 5,
    content: { items: ['摄影', '动画'] },
  },
  {
    moduleId: 'watching',
    moduleType: 'WATCHING',
    visible: true,
    order: 6,
    content: { items: ['原创短片'] },
  },
  {
    moduleId: 'topics',
    moduleType: 'WANT_TO_TALK',
    visible: true,
    order: 7,
    content: { items: ['最近看过的展览'] },
  },
  {
    moduleId: 'skills',
    moduleType: 'CORE_SKILLS',
    visible: true,
    order: 8,
    content: { items: ['产品设计', '用户研究'] },
  },
  {
    moduleId: 'photos',
    moduleType: 'PHOTO_GALLERY',
    visible: true,
    order: 9,
    content: {
      layout: 'TWO',
      items: [
        { imageRef: 'sample-photo-1', altText: '城市街道' },
        { imageRef: 'sample-photo-2', altText: '展览入口' },
      ],
    },
  },
  {
    moduleId: 'projects',
    moduleType: 'PROJECTS',
    visible: true,
    order: 10,
    content: {
      items: [
        {
          projectId: 'project-1',
          name: '社区活动工具',
          summary: '帮助组织者减少重复沟通。',
          role: '产品设计',
          result: '完成首轮真实活动验证',
        },
      ],
    },
  },
  {
    moduleId: 'links',
    moduleType: 'PORTFOLIO_LINKS',
    visible: true,
    order: 11,
    content: {
      items: [{ label: '作品集', url: 'https://example.com/portfolio' }],
    },
  },
];

describe('M2.1-A render model validation', () => {
  it('parses a valid minimal pure display model', () => {
    expect(parseRenderModel(MINIMAL_MODEL)).toEqual(MINIMAL_MODEL);
  });

  it('supports only the module shapes needed by the six approved templates', () => {
    expect(SUPPORTED_MODULES.map((module) => parseRenderModule(module))).toEqual(SUPPORTED_MODULES);
  });

  it('filters hidden modules and sorts visible modules by order', () => {
    const parsedModules = SUPPORTED_MODULES.map((module) => parseRenderModule(module));
    const visible = selectVisibleModules([...parsedModules].reverse());

    expect(visible.some((module) => module.moduleId === 'goal')).toBe(false);
    expect(visible.map((module) => module.order)).toEqual([0, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it('rejects invalid module content and unsupported module types', () => {
    expect(() =>
      parseRenderModule({
        moduleId: 'bad-status',
        moduleType: 'CURRENT_STATUS',
        visible: true,
        order: 0,
        content: { items: ['wrong shape'] },
      }),
    ).toThrow();

    expect(() =>
      parseRenderModule({
        moduleId: 'plugin',
        moduleType: 'PLUGIN_WIDGET',
        visible: true,
        order: 0,
        content: {},
      }),
    ).toThrow();
  });

  it.each([
    ['CURRENT_STATUS', '状态'.repeat(31)],
    ['BIO', '介绍'.repeat(151)],
    ['CURRENT_ROLE', '职业'.repeat(21)],
    ['CURRENT_GOAL', ''],
  ])('rejects invalid %s text length or required emptiness', (moduleType, text) => {
    expect(() =>
      parseRenderModule({
        moduleId: 'text',
        moduleType,
        visible: true,
        order: 0,
        content: { text },
      }),
    ).toThrow();
  });

  it.each([
    ['RECENT_LIKES', 7],
    ['LONG_TERM_INTERESTS', 9],
    ['WATCHING', 7],
    ['WANT_TO_TALK', 9],
    ['CORE_SKILLS', 7],
  ])('rejects %s lists over the PRD count limit', (moduleType, itemCount) => {
    expect(() =>
      parseRenderModule({
        moduleId: 'list',
        moduleType,
        visible: true,
        order: 0,
        content: {
          items: Array.from({ length: itemCount }, (_value, index) => `item-${index}`),
        },
      }),
    ).toThrow();
  });

  it('rejects overlong RECENT_LIKES items', () => {
    expect(() =>
      parseRenderModule({
        moduleId: 'likes',
        moduleType: 'RECENT_LIKES',
        visible: true,
        order: 0,
        content: { items: ['喜'.repeat(31)] },
      }),
    ).toThrow();
  });

  it('rejects gallery layout/count mismatch and invalid photo counts', () => {
    expect(() =>
      parseRenderModule({
        moduleId: 'photos',
        moduleType: 'PHOTO_GALLERY',
        visible: true,
        order: 0,
        content: {
          layout: 'SINGLE',
          items: [],
        },
      }),
    ).toThrow();

    expect(() =>
      parseRenderModule({
        moduleId: 'photos',
        moduleType: 'PHOTO_GALLERY',
        visible: true,
        order: 0,
        content: {
          layout: 'TWO',
          items: [{ imageRef: 'only-one' }],
        },
      }),
    ).toThrow();

    expect(() =>
      parseRenderModule({
        moduleId: 'photos',
        moduleType: 'PHOTO_GALLERY',
        visible: true,
        order: 0,
        content: {
          layout: 'GRID_4',
          items: Array.from({ length: 5 }, (_value, index) => ({
            imageRef: `image-${index}`,
          })),
        },
      }),
    ).toThrow();
  });

  it('rejects overlong photo captions', () => {
    expect(() =>
      parseRenderModule({
        moduleId: 'photos',
        moduleType: 'PHOTO_GALLERY',
        visible: true,
        order: 0,
        content: {
          layout: 'SINGLE',
          items: [{ imageRef: 'image-1', caption: '图'.repeat(31) }],
        },
      }),
    ).toThrow();
  });

  it('rejects empty required project fields, overlong summaries and excess projects', () => {
    const validProject = {
      projectId: 'project-1',
      name: '项目',
      summary: '项目简介',
    };

    expect(() =>
      parseRenderModule({
        moduleId: 'projects',
        moduleType: 'PROJECTS',
        visible: true,
        order: 0,
        content: { items: [{ ...validProject, name: ' ' }] },
      }),
    ).toThrow();

    expect(() =>
      parseRenderModule({
        moduleId: 'projects',
        moduleType: 'PROJECTS',
        visible: true,
        order: 0,
        content: { items: [{ ...validProject, summary: '简'.repeat(501) }] },
      }),
    ).toThrow();

    expect(() =>
      parseRenderModule({
        moduleId: 'projects',
        moduleType: 'PROJECTS',
        visible: true,
        order: 0,
        content: {
          items: Array.from({ length: 6 }, (_value, index) => ({
            ...validProject,
            projectId: `project-${index}`,
          })),
        },
      }),
    ).toThrow();
  });

  it('rejects invalid or excessive portfolio links', () => {
    expect(() =>
      parseRenderModule({
        moduleId: 'links',
        moduleType: 'PORTFOLIO_LINKS',
        visible: true,
        order: 0,
        content: {
          items: [{ label: '不安全链接', url: 'javascript:alert(1)' }],
        },
      }),
    ).toThrow();

    expect(() =>
      parseRenderModule({
        moduleId: 'links',
        moduleType: 'PORTFOLIO_LINKS',
        visible: true,
        order: 0,
        content: {
          items: Array.from({ length: 11 }, (_value, index) => ({
            label: `作品 ${index}`,
            url: `https://example.com/${index}`,
          })),
        },
      }),
    ).toThrow();
  });

  it.each([
    ['IMAGE without value', { kind: 'IMAGE', altText: '图片' }],
    ['IMAGE without alt text', { kind: 'IMAGE', value: 'image-ref' }],
    ['DEFAULT_GRAPHIC with value', { kind: 'DEFAULT_GRAPHIC', value: 'custom' }],
    ['EMOJI without value', { kind: 'EMOJI' }],
  ])('rejects invalid visual invariant: %s', (_label, visual) => {
    expect(() =>
      parseRenderModel({
        ...MINIMAL_MODEL,
        identity: {
          ...MINIMAL_MODEL.identity,
          visual,
        },
      }),
    ).toThrow();
  });

  it.each([
    ['unsupported render version', { ...MINIMAL_MODEL, renderModelVersion: 2 }],
    ['unsupported template version', { ...MINIMAL_MODEL, templateVersion: 2 }],
    ['category mismatch', { ...MINIMAL_MODEL, category: 'RESUME' }],
    [
      'duplicate module IDs',
      {
        ...MINIMAL_MODEL,
        modules: [MINIMAL_MODEL.modules[0], { ...MINIMAL_MODEL.modules[0], order: 1 }],
      },
    ],
    [
      'duplicate module orders',
      {
        ...MINIMAL_MODEL,
        modules: [MINIMAL_MODEL.modules[0], { ...MINIMAL_MODEL.modules[0], moduleId: 'second' }],
      },
    ],
    [
      'negative module order',
      {
        ...MINIMAL_MODEL,
        modules: [{ ...MINIMAL_MODEL.modules[0], order: -1 }],
      },
    ],
  ])('rejects %s', (_label, model) => {
    expect(() => parseRenderModel(model)).toThrow();
  });

  it('whitelists the safe model and drops persistence or implementation metadata', () => {
    const parsed = parseRenderModel({
      ...MINIMAL_MODEL,
      ownerId: 'private-owner',
      userId: 'private-user',
      draftId: 'draft-1',
      revision: 9,
      publishState: 'PUBLISHED',
      snapshotId: 'snapshot-1',
      repository: {},
      cloudFunctionDto: {},
      rendererKey: 'renderer',
      identity: {
        ...MINIMAL_MODEL.identity,
        accountId: 'account-1',
      },
      modules: [
        {
          ...MINIMAL_MODEL.modules[0],
          rendererPath: '/renderer',
          content: {
            ...MINIMAL_MODEL.modules[0].content,
            databaseField: 'private',
          },
        },
      ],
    }) as RenderModel & Record<string, unknown>;

    expect(parsed).toEqual(MINIMAL_MODEL);
    expect(parsed).not.toHaveProperty('ownerId');
    expect(parsed).not.toHaveProperty('revision');
    expect(parsed).not.toHaveProperty('rendererKey');
    expect(parsed.identity).not.toHaveProperty('accountId');
    expect(parsed.modules[0]).not.toHaveProperty('rendererPath');
    expect((parsed.modules[0] as RenderModule).content).not.toHaveProperty('databaseField');
  });
});
