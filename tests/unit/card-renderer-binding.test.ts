import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  RENDERER_BINDINGS,
  RENDERER_KEYS,
} from '../../miniprogram/components/card-renderer/bindings';
import { STABLE_TEMPLATE_IDS } from '../../miniprogram/templates';

const REPOSITORY_ROOT = process.cwd();
const COMPONENT_ROOT = resolve(REPOSITORY_ROOT, 'miniprogram/components/card-renderer');

function readComponentFile(relativePath: string): string {
  return readFileSync(resolve(COMPONENT_ROOT, relativePath), 'utf8');
}

describe('M2.1-B1 static renderer binding', () => {
  it('binds exactly the six approved template IDs to six unique renderer keys', () => {
    expect(Object.keys(RENDERER_BINDINGS)).toEqual([...STABLE_TEMPLATE_IDS]);
    expect(Object.values(RENDERER_BINDINGS)).toEqual([...RENDERER_KEYS]);
    expect(new Set(Object.values(RENDERER_BINDINGS)).size).toBe(6);
  });

  it('keeps TS binding, component declarations and WXML branches consistent', () => {
    const componentConfig = JSON.parse(readComponentFile('index.json')) as {
      usingComponents: Record<string, string>;
    };
    const templateSource = readComponentFile('index.wxml');

    for (const rendererKey of RENDERER_KEYS) {
      expect(templateSource).toContain(`rendererKey === '${rendererKey}'`);
    }

    expect(Object.keys(componentConfig.usingComponents)).toEqual([
      'apple-minimal-renderer',
      'magazine-renderer',
      'scrapbook-renderer',
      'anime-role-renderer',
      'professional-renderer',
      'project-portfolio-renderer',
    ]);
    expect(templateSource.match(/rendererKey ===/gu)).toHaveLength(6);
    expect(templateSource).toContain('<view wx:else class="card-renderer__fallback">');
  });

  it('locks each template key to its exact WXML tag and component path', () => {
    const componentConfig = JSON.parse(readComponentFile('index.json')) as {
      usingComponents: Record<string, string>;
    };
    const templateSource = readComponentFile('index.wxml');
    const expectedPairs = [
      ['T-SOCIAL-01', 'apple-minimal', 'apple-minimal-renderer'],
      ['T-SOCIAL-02', 'magazine', 'magazine-renderer'],
      ['T-SOCIAL-03', 'scrapbook', 'scrapbook-renderer'],
      ['T-SOCIAL-04', 'anime-role', 'anime-role-renderer'],
      ['T-RESUME-01', 'professional', 'professional-renderer'],
      ['T-RESUME-02', 'project-portfolio', 'project-portfolio-renderer'],
    ] as const;

    for (const [templateId, rendererKey, componentTag] of expectedPairs) {
      expect(RENDERER_BINDINGS[templateId]).toBe(rendererKey);
      expect(componentConfig.usingComponents[componentTag]).toBe(
        `./renderers/${rendererKey}/index`,
      );
      expect(templateSource).toMatch(
        new RegExp(
          `<${componentTag}[\\s\\S]*?rendererKey === '${rendererKey}'[\\s\\S]*?</${componentTag}>`,
          'u',
        ),
      );
    }
  });

  it('keeps one formal Apple renderer and five complete isolated B1 shells', () => {
    for (const rendererKey of RENDERER_KEYS) {
      for (const extension of ['json', 'ts', 'wxml', 'wxss']) {
        expect(
          existsSync(resolve(COMPONENT_ROOT, `renderers/${rendererKey}/index.${extension}`)),
        ).toBe(true);
      }
    }

    expect(readComponentFile('renderers/apple-minimal/index.wxml')).not.toContain(
      'B1 RENDERER SHELL',
    );
    expect(readComponentFile('renderers/apple-minimal/index.wxml')).toContain(
      'class="apple-minimal',
    );

    for (const rendererKey of RENDERER_KEYS.filter((key) => key !== 'apple-minimal')) {
      expect(readComponentFile(`renderers/${rendererKey}/index.wxml`)).toContain(
        'B1 RENDERER SHELL',
      );
    }
  });

  it('keeps image ratios in presentation primitives instead of PreparedCardViewModel', () => {
    const primitives = readComponentFile('presentation-primitives.wxss');
    const modelSource = readComponentFile('model.ts');

    expect(primitives).toContain('.renderer-ratio--1-1');
    expect(primitives).toContain('.renderer-ratio--3-4');
    expect(primitives).toContain('.renderer-ratio--4-3');
    expect(primitives).not.toMatch(/4-5|16-9/u);
    expect(modelSource).not.toMatch(/heroRatio|preferredRatio|imageRatio|layout|coordinate/iu);
  });
});
