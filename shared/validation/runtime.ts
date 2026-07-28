export type RuntimeParser<T> = (value: unknown) => T;

export function parseObject(value: unknown): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Expected an object.');
  }

  return value as Record<string, unknown>;
}

export function parseString(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('Expected a string.');
  }

  return value;
}

export function parseNumber(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error('Expected a finite number.');
  }

  return value;
}

export function parseBoolean(value: unknown): boolean {
  if (typeof value !== 'boolean') {
    throw new Error('Expected a boolean.');
  }

  return value;
}

export function parseEnum<TValue extends string>(
  value: unknown,
  allowedValues: readonly TValue[],
): TValue {
  if (typeof value !== 'string' || !allowedValues.includes(value as TValue)) {
    throw new Error('Expected a supported enum value.');
  }

  return value as TValue;
}

export function parseOptional<TValue>(
  value: unknown,
  parser: RuntimeParser<TValue>,
): TValue | undefined {
  return typeof value === 'undefined' ? undefined : parser(value);
}
