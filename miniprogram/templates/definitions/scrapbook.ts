import type { TemplateDefinition } from '../domain';

export const SCRAPBOOK_TEMPLATE: TemplateDefinition = {
  templateId: 'T-SOCIAL-03',
  templateSchemaVersion: 1,
  templateVersion: 1,
  category: 'SOCIAL',
  display: {
    name: '手账拼贴',
    description: '用受控拼贴、生活照片和兴趣便签呈现日常碎片。',
    positioning: '适合希望用生活细节和近期喜好介绍自己的用户。',
  },
  editorLevel: 'L2',
  moduleCapabilities: {
    supported: ['PHOTO_GALLERY', 'RECENT_LIKES'],
    required: ['PHOTO_GALLERY'],
    optional: ['RECENT_LIKES'],
  },
};
