import type { TemplateDefinition } from '../domain';

export const ANIME_ROLE_TEMPLATE: TemplateDefinition = {
  templateId: 'T-SOCIAL-04',
  templateSchemaVersion: 1,
  templateVersion: 1,
  category: 'SOCIAL',
  display: {
    name: '动漫角色卡',
    description: '以原创角色视觉、兴趣徽章和近期关注构成轻量角色面板。',
    positioning: '适合通过兴趣身份和欢迎聊的话题进行破冰的用户。',
  },
  editorLevel: 'L2',
  moduleCapabilities: {
    supported: ['LONG_TERM_INTERESTS', 'WATCHING', 'WANT_TO_TALK'],
    required: ['LONG_TERM_INTERESTS'],
    optional: ['WATCHING', 'WANT_TO_TALK'],
  },
};
