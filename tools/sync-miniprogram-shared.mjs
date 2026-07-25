import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = resolve(REPOSITORY_ROOT, 'shared');
const TARGET_ROOTS = [
  resolve(REPOSITORY_ROOT, 'miniprogram/shared'),
  resolve(REPOSITORY_ROOT, 'cloudfunctions/shared/contracts'),
];
const CHECK_ONLY = process.argv.includes('--check');

function assertTargetBoundaries() {
  const expectedTargets = new Set(['miniprogram/shared', 'cloudfunctions/shared/contracts']);

  for (const targetRoot of TARGET_ROOTS) {
    const targetRelativePath = relative(REPOSITORY_ROOT, targetRoot).replaceAll('\\', '/');

    if (!expectedTargets.has(targetRelativePath)) {
      throw new Error(`Refusing to access unexpected generated target: ${targetRoot}`);
    }
  }
}

async function listTypeScriptFiles(directory, baseDirectory = directory) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const files = [];

  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(absolutePath, baseDirectory)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.ts')) {
      files.push(relative(baseDirectory, absolutePath).replaceAll('\\', '/'));
    }
  }

  return files.sort();
}

function normalizeLineEndings(content) {
  return content.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

async function checkMirror(sourceFiles, targetRoot) {
  const targetFiles = await listTypeScriptFiles(targetRoot);
  const mismatches = [];

  if (JSON.stringify(sourceFiles) !== JSON.stringify(targetFiles)) {
    mismatches.push('file list');
  }

  for (const relativePath of sourceFiles) {
    const sourceContent = normalizeLineEndings(
      await readFile(resolve(SOURCE_ROOT, relativePath), 'utf8'),
    );
    let targetContent;

    try {
      targetContent = normalizeLineEndings(
        await readFile(resolve(targetRoot, relativePath), 'utf8'),
      );
    } catch {
      mismatches.push(relativePath);
      continue;
    }

    if (sourceContent !== targetContent) {
      mismatches.push(relativePath);
    }
  }

  if (mismatches.length > 0) {
    throw new Error(
      `${relative(REPOSITORY_ROOT, targetRoot)} is stale (${mismatches.join(
        ', ',
      )}). Run npm run shared:sync.`,
    );
  }

  console.info(
    `Verified ${sourceFiles.length} mirrored shared TypeScript files in ${relative(
      REPOSITORY_ROOT,
      targetRoot,
    )}.`,
  );
}

async function syncMirror(sourceFiles, targetRoot) {
  const targetFiles = await listTypeScriptFiles(targetRoot);
  const sourceFileSet = new Set(sourceFiles);

  for (const relativePath of sourceFiles) {
    const sourcePath = resolve(SOURCE_ROOT, relativePath);
    const targetPath = resolve(targetRoot, relativePath);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, normalizeLineEndings(await readFile(sourcePath, 'utf8')), 'utf8');
  }

  for (const relativePath of targetFiles) {
    if (!sourceFileSet.has(relativePath)) {
      await unlink(resolve(targetRoot, relativePath));
    }
  }

  console.info(
    `Synchronized ${sourceFiles.length} shared TypeScript files to ${relative(
      REPOSITORY_ROOT,
      targetRoot,
    )}.`,
  );
}

assertTargetBoundaries();

const sourceFiles = await listTypeScriptFiles(SOURCE_ROOT);

if (sourceFiles.length === 0) {
  throw new Error('No canonical shared TypeScript files were found.');
}

if (CHECK_ONLY) {
  for (const targetRoot of TARGET_ROOTS) {
    await checkMirror(sourceFiles, targetRoot);
  }
} else {
  for (const targetRoot of TARGET_ROOTS) {
    await syncMirror(sourceFiles, targetRoot);
  }
}
