import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLOUD_FUNCTION_ROOT = resolve(REPOSITORY_ROOT, 'cloudfunctions');
const FUNCTION_NAMES = ['authEnsureUser', 'accountGetMe', 'accountAcceptPolicies'];
const CHECK_OUTPUT = process.argv.includes('--check');
const require = createRequire(import.meta.url);

function assertFunctionDirectory(functionDirectory, functionName) {
  const expectedDirectory = resolve(CLOUD_FUNCTION_ROOT, functionName);

  if (functionDirectory !== expectedDirectory) {
    throw new Error(`Refusing to build unexpected cloud function path: ${functionDirectory}`);
  }
}

async function verifyPackage(functionDirectory, functionName) {
  const packagePath = resolve(functionDirectory, 'package.json');
  const lockPath = resolve(functionDirectory, 'package-lock.json');
  const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
  const packageLock = JSON.parse(await readFile(lockPath, 'utf8'));

  if (
    packageJson.name !== `tap-name-card-${functionName}` ||
    packageJson.main !== 'index.js' ||
    packageJson.dependencies?.['@cloudbase/node-sdk'] !== '3.18.3' ||
    packageJson.dependencies?.['wx-server-sdk'] !== '4.0.2' ||
    packageJson.dependencies?.ws !== '8.21.1'
  ) {
    throw new Error(`${relative(REPOSITORY_ROOT, packagePath)} is not deployment-safe.`);
  }

  if (
    packageLock.lockfileVersion !== 3 ||
    packageLock.packages?.['']?.dependencies?.['@cloudbase/node-sdk'] !== '3.18.3' ||
    packageLock.packages?.['']?.dependencies?.['wx-server-sdk'] !== '4.0.2' ||
    packageLock.packages?.['']?.dependencies?.ws !== '8.21.1' ||
    packageLock.packages?.['node_modules/@cloudbase/node-sdk']?.version !== '3.18.3' ||
    packageLock.packages?.['node_modules/wx-server-sdk']?.version !== '4.0.2' ||
    packageLock.packages?.['node_modules/wx-server-sdk/node_modules/@cloudbase/node-sdk']
      ?.version !== '3.17.2' ||
    packageLock.packages?.['node_modules/ws']?.version !== '8.21.1'
  ) {
    throw new Error(`${relative(REPOSITORY_ROOT, lockPath)} is not deployment-safe.`);
  }
}

async function verifyOutput(functionDirectory, functionName) {
  const outputPath = resolve(functionDirectory, 'index.js');
  const output = await readFile(outputPath, 'utf8');

  if (/require\((['"])\.\.[/\\]/u.test(output)) {
    throw new Error(`${functionName} deployment output depends on files outside its directory.`);
  }

  const resolvedOutput = require.resolve(outputPath);
  delete require.cache[resolvedOutput];
  const loaded = require(resolvedOutput);

  if (typeof loaded.main !== 'function') {
    throw new Error(`${functionName} deployment output does not export main.`);
  }
}

for (const functionName of FUNCTION_NAMES) {
  const functionDirectory = resolve(CLOUD_FUNCTION_ROOT, functionName);
  assertFunctionDirectory(functionDirectory, functionName);
  await verifyPackage(functionDirectory, functionName);

  await build({
    entryPoints: [resolve(functionDirectory, 'index.ts')],
    outfile: resolve(functionDirectory, 'index.js'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    target: 'node20',
    external: ['@cloudbase/node-sdk', 'wx-server-sdk', 'ws'],
    legalComments: 'none',
    logLevel: 'silent',
    sourcemap: false,
  });

  if (CHECK_OUTPUT) {
    await verifyOutput(functionDirectory, functionName);
  }

  console.info(
    `${CHECK_OUTPUT ? 'Built and verified' : 'Built'} ${relative(
      REPOSITORY_ROOT,
      functionDirectory,
    )}.`,
  );
}
