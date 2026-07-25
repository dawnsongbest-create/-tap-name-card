import { REDACTED_VALUE, SENSITIVE_FIELD_FRAGMENTS } from '../constants/sensitive-fields';

function isSensitiveKey(key: string): boolean {
  const normalizedKey = key.toLowerCase().replace(/_/g, '');
  return SENSITIVE_FIELD_FRAGMENTS.some((fragment) => normalizedKey.includes(fragment));
}

function redactValue(value: unknown, seen: WeakSet<object>): unknown {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);
    return value.map((item) => redactValue(item, seen));
  }

  if (value !== null && typeof value === 'object') {
    if (seen.has(value)) {
      return '[Circular]';
    }

    seen.add(value);

    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [
        key,
        isSensitiveKey(key) ? REDACTED_VALUE : redactValue(nestedValue, seen),
      ]),
    );
  }

  return value;
}

export function redactLogContext(context: Record<string, unknown>): Record<string, unknown> {
  return redactValue(context, new WeakSet()) as Record<string, unknown>;
}
