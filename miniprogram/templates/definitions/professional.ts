import type { TemplateDefinition } from '../domain';

export const PROFESSIONAL_TEMPLATE: TemplateDefinition = {
  templateId: 'T-RESUME-01',
  templateSchemaVersion: 1,
  templateVersion: 1,
  category: 'RESUME',
  display: {
    name: '极简职业卡',
    description: '以当前身份、核心能力和当前目的构成克制的职业摘要。',
    positioning: '适合行业交流、合作沟通和简洁职业介绍。',
  },
  editorLevel: 'L1',
  moduleCapabilities: {
    supported: ['CURRENT_ROLE', 'CORE_SKILLS', 'CURRENT_GOAL'],
    required: ['CURRENT_ROLE', 'CORE_SKILLS', 'CURRENT_GOAL'],
    optional: [],
  },
};
