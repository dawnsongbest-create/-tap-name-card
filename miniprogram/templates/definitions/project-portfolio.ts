import type { TemplateDefinition } from '../domain';

export const PROJECT_PORTFOLIO_TEMPLATE: TemplateDefinition = {
  templateId: 'T-RESUME-02',
  templateSchemaVersion: 1,
  templateVersion: 1,
  category: 'RESUME',
  display: {
    name: '项目作品卡',
    description: '以代表项目、个人角色、贡献和结果为主要信息层级。',
    positioning: '适合需要用具体项目和作品证明能力的用户。',
  },
  editorLevel: 'L2',
  moduleCapabilities: {
    supported: ['PROJECTS', 'PORTFOLIO_LINKS'],
    required: ['PROJECTS'],
    optional: ['PORTFOLIO_LINKS'],
  },
};
