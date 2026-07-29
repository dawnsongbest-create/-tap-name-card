import type { TemplateDefinition } from '../domain';

export const MAGAZINE_TEMPLATE: TemplateDefinition = {
  templateId: 'T-SOCIAL-02',
  templateSchemaVersion: 1,
  templateVersion: 1,
  category: 'SOCIAL',
  display: {
    name: '杂志人物页',
    description: '大图、封面式标题和人物自述构成编辑式页面。',
    positioning: '适合希望通过照片和个人叙事建立第一印象的用户。',
  },
  editorLevel: 'L2',
  moduleCapabilities: {
    supported: ['PHOTO_GALLERY', 'BIO'],
    required: ['PHOTO_GALLERY'],
    optional: ['BIO'],
  },
};
