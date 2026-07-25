import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE_ROOT = resolve(REPOSITORY_ROOT, 'shared');
const TARGET_ROOT = resolve(REPOSITORY_ROOT, 'miniprogram/shared');
const CHECK_ONLY = process.argv.includes('--check');

function assertTargetBoundary() {
  const targetRelativePath = relative(REPOSITORY_ROOT, TARGET_ROOT).replaceAll('\\', '/');

  if (targetRelativePath !== 'miniprogram/shared') {
    throw new Error(`Refusing to access unexpected generated target: ${TARGET_ROOT}`);
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

async function checkMirror(sourceFiles) {
  const targetFiles = await listTypeScriptFiles(TARGET_ROOT);
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
        await readFile(resolve(TARGET_ROOT, relativePath), 'utf8'),
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
      `miniprogram/shared is stale (${mismatches.join(', ')}). Run npm run shared:sync.`,
    );
  }

  console.info(`Verified ${sourceFiles.length} mirrored shared TypeScript files.`);
}

async function syncMirror(sourceFiles) {
  const targetFiles = await listTypeScriptFiles(TARGET_ROOT);
  const sourceFileSet = new Set(sourceFiles);

  for (const relativePath of sourceFiles) {
    const sourcePath = resolve(SOURCE_ROOT, relativePath);
    const targetPath = resolve(TARGET_ROOT, relativePath);

    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, normalizeLineEndings(await readFile(sourcePath, 'utf8')), 'utf8');
  }

  for (const relativePath of targetFiles) {
    if (!sourceFileSet.has(relativePath)) {
      await unlink(resolve(TARGET_ROOT, relativePath));
    }
  }

  console.info(`Synchronized ${sourceFiles.length} shared TypeScript files.`);
}

assertTargetBoundary();

const sourceFiles = await listTypeScriptFiles(SOURCE_ROOT);

if (sourceFiles.length === 0) {
  throw new Error('No canonical shared TypeScript files were found.');
}

if (CHECK_ONLY) {
  await checkMirror(sourceFiles);
} else {
  await syncMirror(sourceFiles);
}
