import type { TemplateId } from '../domain';

export const RENDERER_FIXTURE_SCENARIOS = [
  'NORMAL',
  'LONG_TEXT',
  'MISSING_IMAGE',
  'MINIMAL_OPTIONAL_CONTENT',
] as const;

export type RendererFixtureScenario = (typeof RENDERER_FIXTURE_SCENARIOS)[number];

const SOCIAL_IDENTITY = {
  displayName: '林岚',
  headline: '慢热，但遇到喜欢的话题会说很多。',
  tags: ['城市散步', '独立音乐', '胶片摄影'],
  visual: {
    kind: 'IMAGE',
    value: '/assets/templates/fixture-social-identity.jpg',
    altText: '阳光落在浅色石材和金属结构上的建筑光影',
  },
} as const;

const RESUME_IDENTITY = {
  displayName: 'Lin Lan',
  headline: 'Product designer focused on thoughtful tools for real communities.',
  tags: ['Product Design', 'Research', 'Prototyping'],
  visual: {
    kind: 'IMAGE',
    value: '/assets/templates/fixture-resume-portrait.png',
    altText: '原创职业人物视觉占位',
  },
} as const;

const LONG_SOCIAL_IDENTITY = {
  ...SOCIAL_IDENTITY,
  displayName: '林岚与一段接近边界的中文昵称',
  headline: '喜欢记录城市里容易被忽略的角落，也愿意认真听别人讲最近真正投入的事情。🎞️',
  tags: ['城市散步与街区观察', 'Independent Music & Live Shows', '胶片摄影 🎞️'],
} as const;

const LONG_RESUME_IDENTITY = {
  ...RESUME_IDENTITY,
  displayName: 'Alexandria-Lin ProductDesign',
  headline:
    'Product designer working across research, interaction systems, prototyping, and community operations.',
  tags: ['ProductStrategyAndResearch', 'Cross-functional Collaboration', '原型与用户验证 🧭'],
} as const;

function createIdentity(
  category: 'SOCIAL' | 'RESUME',
  scenario: RendererFixtureScenario,
): Record<string, unknown> {
  const identity =
    category === 'SOCIAL'
      ? scenario === 'LONG_TEXT'
        ? LONG_SOCIAL_IDENTITY
        : SOCIAL_IDENTITY
      : scenario === 'LONG_TEXT'
        ? LONG_RESUME_IDENTITY
        : RESUME_IDENTITY;

  if (scenario === 'MISSING_IMAGE' || scenario === 'MINIMAL_OPTIONAL_CONTENT') {
    return {
      displayName: identity.displayName,
      headline: identity.headline,
      tags: [...identity.tags],
    };
  }

  return identity;
}

function createGalleryModule(
  scenario: RendererFixtureScenario,
  moduleId = 'gallery',
): Record<string, unknown> {
  const longCaption = scenario === 'LONG_TEXT' ? '雨后沿着旧街区慢慢走到展览入口' : '周末街区散步';

  return {
    moduleId,
    moduleType: 'PHOTO_GALLERY',
    visible: true,
    order: 0,
    content: {
      layout: 'TWO',
      items: [
        {
          imageRef: '/assets/templates/fixture-city-walk.png',
          caption: longCaption,
          altText: '原创城市街道视觉占位',
        },
        {
          imageRef: '/assets/templates/fixture-exhibition.png',
          caption: scenario === 'LONG_TEXT' ? '和朋友一起看完展览后的傍晚' : '展览入口',
          altText: '原创展览入口视觉占位',
        },
      ],
    },
  };
}

function createModules(
  templateId: TemplateId,
  scenario: RendererFixtureScenario,
): readonly Record<string, unknown>[] {
  const minimal = scenario === 'MINIMAL_OPTIONAL_CONTENT';
  const long = scenario === 'LONG_TEXT';

  switch (templateId) {
    case 'T-SOCIAL-01':
      return minimal
        ? []
        : [
            {
              moduleId: 'status',
              moduleType: 'CURRENT_STATUS',
              visible: true,
              order: 0,
              content: {
                text: long
                  ? '最近在整理一次很长的城市步行记录，也在学习如何把复杂观察讲得更清楚。'
                  : '最近在学习胶片摄影。',
              },
            },
          ];
    case 'T-SOCIAL-02':
      return [
        createGalleryModule(scenario),
        ...(minimal
          ? []
          : [
              {
                moduleId: 'bio',
                moduleType: 'BIO',
                visible: true,
                order: 1,
                content: {
                  text: long
                    ? '我喜欢从日常生活里收集小故事：一条反复走过的街、一家换了招牌的旧店、一次聊到很晚的活动。比起迅速给出结论，我更愿意先观察、记录，再把真正重要的部分慢慢整理出来。'
                    : '喜欢记录城市里不起眼的角落，也喜欢听别人讲最近真正投入的事情。',
                },
              },
            ]),
      ];
    case 'T-SOCIAL-03':
      return [
        createGalleryModule(scenario),
        ...(minimal
          ? []
          : [
              {
                moduleId: 'likes',
                moduleType: 'RECENT_LIKES',
                visible: true,
                order: 1,
                content: {
                  items: long
                    ? [
                        '在旧书店寻找有手写批注的书',
                        '沿河散步时记录不同颜色的门',
                        '周末去听不认识的独立乐队',
                        '把票根和小卡片收进手账',
                      ]
                    : ['旧书店', '现场演出', '城市散步'],
                },
              },
            ]),
      ];
    case 'T-SOCIAL-04':
      return [
        {
          moduleId: 'interests',
          moduleType: 'LONG_TERM_INTERESTS',
          visible: true,
          order: 0,
          content: {
            items: long
              ? ['原创动画设定与分镜', '城市观察和视觉记录', '独立游戏中的叙事设计']
              : ['原创动画', '摄影', '独立游戏'],
          },
        },
        ...(minimal
          ? []
          : [
              {
                moduleId: 'watching',
                moduleType: 'WATCHING',
                visible: true,
                order: 1,
                content: {
                  items: long
                    ? ['最近在看一组关于城市记忆的原创短片', '一部节奏很慢但声音设计很好的动画']
                    : ['原创短片', '独立动画'],
                },
              },
              {
                moduleId: 'topics',
                moduleType: 'WANT_TO_TALK',
                visible: true,
                order: 2,
                content: {
                  items: long
                    ? [
                        '最近真正投入的一件小事',
                        '喜欢的角色为什么让人记得很久',
                        '如何开始一个个人项目',
                      ]
                    : ['最近看过的展览', '原创角色'],
                },
              },
            ]),
      ];
    case 'T-RESUME-01':
      return [
        {
          moduleId: 'role',
          moduleType: 'CURRENT_ROLE',
          visible: true,
          order: 0,
          content: {
            text: long ? 'Independent Product Design Lead' : '独立产品设计师',
          },
        },
        {
          moduleId: 'skills',
          moduleType: 'CORE_SKILLS',
          visible: true,
          order: 1,
          content: {
            items: long
              ? [
                  'ProductStrategyAndResearch',
                  'Complex Interaction Prototyping',
                  '跨团队工作坊设计',
                  'Design Systems',
                ]
              : ['产品设计', '用户研究', '原型验证'],
          },
        },
        {
          moduleId: 'goal',
          moduleType: 'CURRENT_GOAL',
          visible: true,
          order: 2,
          content: {
            text: long
              ? '寻找愿意长期合作、重视真实用户验证并能共同定义问题的产品团队'
              : '寻找长期合作项目',
          },
        },
      ];
    case 'T-RESUME-02':
      return [
        {
          moduleId: 'projects',
          moduleType: 'PROJECTS',
          visible: true,
          order: 0,
          content: {
            items: [
              {
                projectId: 'community-tool',
                name: long ? 'Community Activity Coordination Toolkit' : '社区活动工具',
                summary: long
                  ? '为小型社区活动设计从报名、现场协作到活动后复盘的轻量工具，减少组织者在多个聊天窗口之间重复确认信息的成本。'
                  : '帮助组织者减少重复沟通，并完成首轮真实活动验证。',
                role: '产品设计',
                contribution: long
                  ? '完成访谈、流程梳理、交互原型和两轮现场验证'
                  : '研究与交互设计',
                result: long ? '首轮活动的重复确认消息减少约一半' : '完成首轮真实活动验证',
                ...(scenario === 'MISSING_IMAGE'
                  ? {}
                  : { imageRef: '/assets/templates/fixture-project-cover.png' }),
              },
            ],
          },
        },
        ...(minimal
          ? []
          : [
              {
                moduleId: 'links',
                moduleType: 'PORTFOLIO_LINKS',
                visible: true,
                order: 1,
                content: {
                  items: [
                    {
                      label: long ? '完整项目作品集与过程记录' : '作品集',
                      url: 'https://example.com/portfolio',
                    },
                  ],
                },
              },
            ]),
      ];
  }
}

export function createRendererFixtureCandidate(
  templateId: TemplateId,
  scenario: RendererFixtureScenario,
): unknown {
  const category = templateId.startsWith('T-SOCIAL') ? 'SOCIAL' : 'RESUME';

  return {
    renderModelVersion: 1,
    templateId,
    templateVersion: 1,
    category,
    identity: createIdentity(category, scenario),
    modules: createModules(templateId, scenario),
  };
}

export function isRendererFixtureScenario(value: unknown): value is RendererFixtureScenario {
  return (
    typeof value === 'string' && (RENDERER_FIXTURE_SCENARIOS as readonly string[]).includes(value)
  );
}
