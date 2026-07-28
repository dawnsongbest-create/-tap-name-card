import { describe, expect, it } from 'vitest';

import {
  parseBoolean,
  parseEnum,
  parseNumber,
  parseObject,
  parseOptional,
  parseString,
} from '../../shared/validation/runtime';

describe('runtime validation primitives', () => {
  it('parses the supported primitive values without coercion', () => {
    const objectValue = { value: 'safe' };

    expect(parseObject(objectValue)).toBe(objectValue);
    expect(parseString('safe')).toBe('safe');
    expect(parseNumber(42)).toBe(42);
    expect(parseBoolean(false)).toBe(false);
    expect(parseEnum('ACTIVE', ['ACTIVE', 'RESTRICTED'] as const)).toBe('ACTIVE');
    expect(parseOptional(undefined, parseString)).toBeUndefined();
    expect(parseOptional('present', parseString)).toBe('present');
  });

  it.each([
    ['object null', () => parseObject(null)],
    ['object array', () => parseObject([])],
    ['string coercion', () => parseString(42)],
    ['number coercion', () => parseNumber('42')],
    ['non-finite number', () => parseNumber(Number.POSITIVE_INFINITY)],
    ['boolean coercion', () => parseBoolean(1)],
    ['unknown enum', () => parseEnum('DELETED', ['ACTIVE', 'RESTRICTED'] as const)],
    ['null optional', () => parseOptional(null, parseString)],
  ])('rejects %s', (_label, parse) => {
    expect(parse).toThrow();
  });
});
