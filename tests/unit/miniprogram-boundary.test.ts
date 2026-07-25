import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';

import { describe, expect, it } from 'vitest';

interface MiniProgramAppConfig {
  pages: string[];
}

const REPOSITORY_ROOT = process.cwd();
const MINIPROGRAM_ROOT = resolve(REPOSITORY_ROOT, 'miniprogram');

function listTypeScriptFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      return listTypeScriptFiles(absolutePath);
    }

    return entry.isFile() && entry.name.endsWith('.ts') ? [absolutePath] : [];
  });
}

function resolvesInsideMiniProgramRoot(importer: string, specifier: string): boolean {
  const resolvedImport = resolve(dirname(importer), specifier);
  const relativeImport = relative(MINIPROGRAM_ROOT, resolvedImport);

  return (
    relativeImport !== '..' && !relativeImport.startsWith(`..${sep}`) && !isAbsolute(relativeImport)
  );
}

function importTargetExists(importer: string, specifier: string): boolean {
  const resolvedImport = resolve(dirname(importer), specifier);

  return (
    existsSync(resolvedImport) ||
    existsSync(`${resolvedImport}.ts`) ||
    existsSync(join(resolvedImport, 'index.ts'))
  );
}

describe('WeChat mini-program compilation boundary', () => {
  it('keeps every relative TypeScript import inside miniprogramRoot', () => {
    const importPattern = /\bfrom\s+['"](\.[^'"]+)['"]/g;

    for (const sourcePath of listTypeScriptFiles(MINIPROGRAM_ROOT)) {
      const source = readFileSync(sourcePath, 'utf8');

      for (const match of source.matchAll(importPattern)) {
        const specifier = match[1];

        expect(specifier).toBeDefined();
        expect(
          resolvesInsideMiniProgramRoot(sourcePath, specifier as string),
          `${relative(REPOSITORY_ROOT, sourcePath)} crosses miniprogramRoot`,
        ).toBe(true);
        expect(
          importTargetExists(sourcePath, specifier as string),
          `${relative(REPOSITORY_ROOT, sourcePath)} imports missing ${specifier}`,
        ).toBe(true);
      }
    }
  });

  it('registers every app.json page with a native Page call and complete page files', () => {
    const appConfig = JSON.parse(
      readFileSync(resolve(MINIPROGRAM_ROOT, 'app.json'), 'utf8'),
    ) as MiniProgramAppConfig;

    expect(appConfig.pages).toContain('pages/foundation/index');

    for (const pagePath of appConfig.pages) {
      for (const extension of ['.ts', '.json', '.wxml', '.wxss']) {
        expect(existsSync(resolve(MINIPROGRAM_ROOT, `${pagePath}${extension}`))).toBe(true);
      }

      const pageSource = readFileSync(resolve(MINIPROGRAM_ROOT, `${pagePath}.ts`), 'utf8');
      expect(pageSource).toMatch(/\bPage\s*\(/);
    }
  });

  it('keeps server-only identity records out of the client contract mirror', () => {
    const userContract = readFileSync(resolve(MINIPROGRAM_ROOT, 'shared/types/user.ts'), 'utf8');

    expect(userContract).not.toContain('openId');
    expect(userContract).not.toContain('UserRecord');
    expect(userContract).not.toContain('IdentityMapping');
    expect(userContract).not.toContain('DELETED');
  });

  it('does not create an account during application launch', () => {
    const appSource = readFileSync(resolve(MINIPROGRAM_ROOT, 'app.ts'), 'utf8');

    expect(appSource).not.toContain('authEnsureUser');
    expect(appSource).not.toContain('ensureUser');
    expect(appSource).not.toContain('accountGetMe');
    expect(appSource).not.toContain('accountAcceptPolicies');
    expect(appSource).not.toContain('callFunction');
    expect(appSource).toContain('initializeCloudForEnvironment');
  });
});
