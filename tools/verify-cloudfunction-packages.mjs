import { spawn } from 'node:child_process';
import { copyFile, mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPOSITORY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLOUD_FUNCTION_ROOT = resolve(REPOSITORY_ROOT, 'cloudfunctions');
const FUNCTION_NAMES = ['authEnsureUser', 'accountGetMe', 'accountAcceptPolicies'];
const DEPLOYMENT_FILES = ['index.js', 'package.json', 'package-lock.json'];

function run(command, arguments_, cwd, environment = process.env) {
  return new Promise((resolvePromise, rejectPromise) => {
    const child = spawn(command, arguments_, {
      cwd,
      env: environment,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += String(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += String(chunk);
    });
    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise(output);
        return;
      }

      rejectPromise(
        new Error(
          `${command} ${arguments_.join(' ')} failed in ${cwd} with code ${String(code)}.\n${output}`,
        ),
      );
    });
  });
}

function assertTemporaryRoot(path) {
  const resolvedTemporaryDirectory = resolve(tmpdir());
  const resolvedPath = resolve(path);

  if (
    resolvedPath === resolvedTemporaryDirectory ||
    !resolvedPath.startsWith(`${resolvedTemporaryDirectory}${sep}`)
  ) {
    throw new Error(`Refusing to use unsafe temporary path: ${resolvedPath}`);
  }
}

function verifyBundledSource(source, functionName) {
  const forbiddenPatterns = [
    { label: 'source map reference', pattern: /sourceMappingURL/u },
    { label: 'test source', pattern: /tests[/\\]|\.test\.[cm]?[jt]s/u },
    { label: 'private project config', pattern: /project\.private\.config\.json/u },
    { label: 'repository absolute path', pattern: /tap-name-card[/\\]cloudfunctions/u },
    { label: 'cross-function relative dependency', pattern: /require\((['"])\.\.[/\\]/u },
  ];

  for (const { label, pattern } of forbiddenPatterns) {
    if (pattern.test(source)) {
      throw new Error(`${functionName} deployment bundle contains a forbidden ${label}.`);
    }
  }
}

const temporaryRoot = await mkdtemp(join(tmpdir(), 'tap-name-card-cloudfunctions-'));
assertTemporaryRoot(temporaryRoot);
const npmCliPath = process.env.npm_execpath;

if (!npmCliPath) {
  throw new Error('npm_execpath is unavailable; run this check through npm.');
}

const isolatedEnvironment = {
  ...process.env,
  npm_config_cache: resolve(temporaryRoot, '.npm-cache'),
};

try {
  for (const functionName of FUNCTION_NAMES) {
    const sourceDirectory = resolve(CLOUD_FUNCTION_ROOT, functionName);
    const isolatedDirectory = resolve(temporaryRoot, functionName);

    if (sourceDirectory !== resolve(CLOUD_FUNCTION_ROOT, functionName)) {
      throw new Error(`Unexpected cloud function source path: ${sourceDirectory}`);
    }

    await mkdir(isolatedDirectory);

    for (const fileName of DEPLOYMENT_FILES) {
      await copyFile(resolve(sourceDirectory, fileName), resolve(isolatedDirectory, fileName));
    }

    verifyBundledSource(
      await readFile(resolve(isolatedDirectory, 'index.js'), 'utf8'),
      functionName,
    );

    await run(
      process.execPath,
      [npmCliPath, 'ci', '--ignore-scripts', '--omit=dev', '--no-audit', '--no-fund'],
      isolatedDirectory,
      isolatedEnvironment,
    );
    await run(
      process.execPath,
      [npmCliPath, 'ls', '--omit=dev', '--all'],
      isolatedDirectory,
      isolatedEnvironment,
    );
    await run(
      process.execPath,
      [
        '-e',
        "const loaded=require('./index.js');if(typeof loaded.main!=='function'){process.exit(1)}",
      ],
      isolatedDirectory,
      isolatedEnvironment,
    );

    console.info(
      `Installed production dependencies and loaded isolated ${relative(
        REPOSITORY_ROOT,
        sourceDirectory,
      )}.`,
    );
  }
} finally {
  assertTemporaryRoot(temporaryRoot);
  await rm(temporaryRoot, { recursive: true, force: true });
}
