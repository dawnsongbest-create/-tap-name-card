export interface RequestIdProvider {
  create(): string;
}

export interface RequestIdDependencies {
  now: () => number;
  random: () => number;
}

const DEFAULT_DEPENDENCIES: RequestIdDependencies = {
  now: Date.now,
  random: Math.random,
};

export function createRequestId(
  prefix = 'req',
  dependencies: RequestIdDependencies = DEFAULT_DEPENDENCIES,
): string {
  const timestamp = dependencies.now().toString(36);
  const entropy = Math.floor(dependencies.random() * Number.MAX_SAFE_INTEGER).toString(36);

  return `${prefix}_${timestamp}_${entropy}`;
}

export function createRequestIdProvider(prefix = 'req'): RequestIdProvider {
  return {
    create: () => createRequestId(prefix),
  };
}
