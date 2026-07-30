import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { createCardRendererState } from '../../miniprogram/components/card-renderer/prepare';
import {
  RENDERER_FIXTURE_SCENARIOS,
  createRendererFixtureCandidate,
} from '../../miniprogram/templates/fixtures';
import { parseRenderModel, STABLE_TEMPLATE_IDS } from '../../miniprogram/templates';

const REPOSITORY_ROOT = process.cwd();

function readSource(relativePath: string): string {
  return readFileSync(resolve(REPOSITORY_ROOT, relativePath), 'utf8');
}

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return listTypeScriptFiles(path);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('M2.1-B1 official renderer fixtures', () => {
  it('makes every official template/scenario fixture parser- and capability-valid', () => {
    for (const templateId of STABLE_TEMPLATE_IDS) {
      for (const scenario of RENDERER_FIXTURE_SCENARIOS) {
        const candidate = createRendererFixtureCandidate(templateId, scenario);

        expect(() => parseRenderModel(candidate), `${templateId}/${scenario}`).not.toThrow();
        expect(createCardRendererState(candidate), `${templateId}/${scenario}`).toMatchObject({
          status: 'ready',
          templateId,
        });
      }
    }
  });

  it('defines MISSING_IMAGE as optional image absence with no I/O or invalid image probing', () => {
    for (const templateId of STABLE_TEMPLATE_IDS) {
      const model = parseRenderModel(createRendererFixtureCandidate(templateId, 'MISSING_IMAGE'));

      expect(model.identity.visual).toBeUndefined();

      for (const module of model.modules) {
        if (module.moduleType === 'PHOTO_GALLERY') {
          expect(module.content.items.length).toBeGreaterThan(0);
          expect(module.content.items.every((item) => item.imageRef.startsWith('/assets/'))).toBe(
            true,
          );
        }

        if (module.moduleType === 'PROJECTS') {
          expect(module.content.items.every((item) => item.imageRef === undefined)).toBe(true);
        }
      }
    }
  });
});

describe('M2.1-B1 runtime and development harness boundaries', () => {
  it('has one raw parsing ingress in the CardRenderer runtime package', () => {
    const rendererRoot = resolve(REPOSITORY_ROOT, 'miniprogram/components/card-renderer');
    const rendererSource = listTypeScriptFiles(rendererRoot)
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');
    const fixtureSource = readSource('miniprogram/templates/fixtures/index.ts');
    const labSource = readSource('miniprogram/pages/foundation/renderer-lab.ts');

    expect(rendererSource.match(/\bparseRenderModel\s*\(/gu)).toHaveLength(1);
    expect(fixtureSource).not.toContain('parseRenderModel');
    expect(labSource).not.toContain('parseRenderModel');
  });

  it('keeps Renderer Lab switching local and removable from renderer architecture', () => {
    const labSource = readSource('miniprogram/pages/foundation/renderer-lab.ts');
    const pageSource = readSource('miniprogram/pages/foundation/index.ts');
    const templateSource = readSource('miniprogram/pages/foundation/index.wxml');
    const forbiddenPattern =
      /services|identity|authApi|CloudBase|callFunction|navigateTo|redirectTo|switchTab|setStorage|database/iu;

    expect(labSource).not.toMatch(forbiddenPattern);
    expect(templateSource).toContain('id="renderer-lab-card-renderer"');
    expect(templateSource).toContain('model="{{rendererLabModel}}"');
    expect(templateSource).not.toContain('<navigator');

    for (const handler of ['onSelectRendererLabTemplate', 'onSelectRendererLabScenario']) {
      const handlerStart = pageSource.indexOf(`${handler}(`);
      const nextHandler = pageSource.indexOf('\n  },', handlerStart);
      const handlerSource = pageSource.slice(handlerStart, nextHandler);

      expect(handlerStart).toBeGreaterThan(-1);
      expect(handlerSource).toContain('this.setData');
      expect(handlerSource).not.toMatch(forbiddenPattern);
    }
  });

  it('keeps renderer foundation free from service, persistence, route and external-state imports', () => {
    const rendererRoot = resolve(REPOSITORY_ROOT, 'miniprogram/components/card-renderer');
    const source = listTypeScriptFiles(rendererRoot)
      .map((path) => readFileSync(path, 'utf8'))
      .join('\n');

    expect(source).not.toMatch(
      /from ['"][^'"]*(?:services|state|pages|persistence|repository|cloudfunctions)[^'"]*['"]/iu,
    );
    expect(source).not.toMatch(/\b(?:Date|Math\.random|setTimeout|fetch|wx\.)\b/u);
  });
});
