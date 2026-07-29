import { readFileSync, readdirSync } from 'node:fs';
import { dirname, relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

const REPOSITORY_ROOT = process.cwd();
const MINIPROGRAM_ROOT = resolve(REPOSITORY_ROOT, 'miniprogram');
const TEMPLATE_ROOT = resolve(REPOSITORY_ROOT, 'miniprogram/templates');
const ALLOWED_SHARED_RUNTIME_PRIMITIVE = resolve(MINIPROGRAM_ROOT, 'shared/validation/runtime');

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return listTypeScriptFiles(path);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [path] : [];
  });
}

describe('M2.1-A template architecture boundary', () => {
  it('keeps the local template domain independent from persistence, cloud services and identity', () => {
    const relativeImportPattern = /\bfrom\s+['"](\.[^'"]+)['"]/gu;
    const forbiddenField =
      /\b(?:ownerId|userId|draftId|revision|publishState|snapshotId|repository|cloudFunctionDto)\b/u;

    for (const file of listTypeScriptFiles(TEMPLATE_ROOT)) {
      const source = readFileSync(file, 'utf8');
      const fileName = relative(REPOSITORY_ROOT, file);

      expect(source, `${fileName} contains persistence or identity fields`).not.toMatch(
        forbiddenField,
      );

      for (const match of source.matchAll(relativeImportPattern)) {
        const specifier = match[1] as string;
        const target = resolve(dirname(file), specifier);
        const targetFromMiniProgram = relative(MINIPROGRAM_ROOT, target);
        const targetSegments = targetFromMiniProgram.split(sep);

        expect(
          targetSegments.some((segment) =>
            ['pages', 'services', 'state', 'components', 'persistence', 'repository'].includes(
              segment,
            ),
          ),
          `${fileName} imports excluded client layer ${specifier}`,
        ).toBe(false);

        if (targetSegments[0] === 'shared') {
          expect(
            target,
            `${fileName} may only reuse the existing runtime validation primitives`,
          ).toBe(ALLOWED_SHARED_RUNTIME_PRIMITIVE);
        }
      }
    }
  });

  it('does not introduce template contracts into root shared or generated mirrors', () => {
    const sharedRoots = [
      resolve(REPOSITORY_ROOT, 'shared'),
      resolve(REPOSITORY_ROOT, 'miniprogram/shared'),
      resolve(REPOSITORY_ROOT, 'cloudfunctions/shared/contracts'),
    ];

    for (const sharedRoot of sharedRoots) {
      for (const file of listTypeScriptFiles(sharedRoot)) {
        const path = relative(sharedRoot, file);
        const source = readFileSync(file, 'utf8');

        expect(path).not.toMatch(/(?:^|[\\/])(?:template|render-model)(?:[\\/.-]|$)/iu);
        expect(source, `${path} contains a template contract outside the local domain`).not.toMatch(
          /\b(?:TemplateDefinition|TemplateRegistryEntry|RenderModel)\b/u,
        );
      }
    }
  });

  it('does not add renderer, fixture, asset or preview implementation files in M2.1-A', () => {
    const implementationPattern = /(?:renderer|fixture|preview|asset)/iu;

    expect(
      listTypeScriptFiles(TEMPLATE_ROOT)
        .map((path) => relative(TEMPLATE_ROOT, path))
        .filter((path) => implementationPattern.test(path)),
    ).toEqual([]);
  });
});
