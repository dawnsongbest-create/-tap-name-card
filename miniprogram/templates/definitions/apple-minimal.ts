import type { TemplateDefinition } from '../domain';

export const APPLE_MINIMAL_TEMPLATE: TemplateDefinition = {
  templateId: 'T-SOCIAL-01',
  templateSchemaVersion: 1,
  templateVersion: 1,
  category: 'SOCIAL',
  display: {
    name: 'Apple Minimal',
    description: '大量留白、克制层级和轻量视觉主体。',
    positioning: '适合希望用少量核心信息完成清晰自我介绍的用户。',
  },
  editorLevel: 'L1',
  moduleCapabilities: {
    supported: ['CURRENT_STATUS'],
    required: [],
    optional: ['CURRENT_STATUS'],
  },
};
