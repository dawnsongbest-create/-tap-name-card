import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPOSITORY_ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8');
}

describe('FT-01 product routes and pages', () => {
  it('makes Gallery the landing route while preserving Preview and Foundation', () => {
    const appConfig = JSON.parse(readSource('miniprogram/app.json')) as {
      pages: readonly string[];
    };

    expect(appConfig.pages).toEqual([
      'pages/template-gallery/index',
      'pages/template-preview/index',
      'pages/foundation/index',
    ]);
  });

  it('uses the public CardRenderer without duplicating child renderer markup', () => {
    const galleryTemplate = readSource('miniprogram/pages/template-gallery/index.wxml');
    const previewTemplate = readSource('miniprogram/pages/template-preview/index.wxml');
    const productTemplates = `${galleryTemplate}\n${previewTemplate}`;

    expect(galleryTemplate).toContain('<card-renderer model="{{item.previewModel}}"');
    expect(previewTemplate).toContain('<card-renderer model="{{previewModel}}"');
    expect(productTemplates).not.toMatch(
      /<(?:apple-minimal|magazine|scrapbook|anime-role|professional|project-portfolio)-renderer/iu,
    );
  });

  it('keeps Gallery product-only and exposes no development metadata', () => {
    const template = readSource('miniprogram/pages/template-gallery/index.wxml');

    expect(template).toContain('选择你的名牌');
    expect(template).toContain('先看看风格，再开始制作');
    expect(template).toContain('查看完整预览');
    expect(template).not.toMatch(
      />\s*\{\{item\.(?:templateId|templateVersion|editorLevel)\}\}\s*</u,
    );
    expect(template).not.toMatch(/Renderer Lab|scenario|editorLevel/iu);
    expect(template).not.toContain('使用这个模板');
  });

  it('keeps Preview route inputs minimal and selection local', () => {
    const pageSource = readSource('miniprogram/pages/template-preview/index.ts');
    const template = readSource('miniprogram/pages/template-preview/index.wxml');

    expect(pageSource).toContain('templateId?: string');
    expect(pageSource).toContain('templateVersion?: string');
    expect(pageSource).not.toMatch(/options\.category|dataset\.category|data-category/u);
    expect(template).toContain('使用这个模板');
    expect(template).toContain('下一步将进入编辑器');
    expect(pageSource).not.toMatch(/navigateTo|redirectTo|reLaunch|switchTab/u);
  });

  it('keeps the product path anonymous and free from external mutations', () => {
    const productSources = [
      'miniprogram/product/launch-templates.ts',
      'miniprogram/product/launch-preview-models.ts',
      'miniprogram/pages/template-gallery/index.ts',
      'miniprogram/pages/template-preview/index.ts',
    ]
      .map(readSource)
      .join('\n');
    const forbiddenImport =
      /from ['"][^'"]*(?:services\/(?:auth|cloud)|state\/auth|pages\/foundation|templates\/fixtures)[^'"]*['"]/iu;
    const forbiddenMutation =
      /\b(?:authEnsureUser|accountGetMe|accountAcceptPolicies|callFunction|database|setStorage|setStorageSync|cardCreate|analytics)\b/u;

    expect(productSources).not.toMatch(forbiddenImport);
    expect(productSources).not.toMatch(forbiddenMutation);
    expect(productSources).not.toMatch(/renderer-lab|RENDERER_FIXTURE_SCENARIOS/iu);
  });

  it('keeps product pages independent from the six-template registry surface', () => {
    const pageSources = [
      'miniprogram/pages/template-gallery/index.ts',
      'miniprogram/pages/template-preview/index.ts',
    ]
      .map(readSource)
      .join('\n');

    expect(pageSources).not.toMatch(/templateRegistry|STABLE_TEMPLATE_IDS/u);
  });
});
