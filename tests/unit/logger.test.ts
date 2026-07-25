import { describe, expect, it } from 'vitest';

import { REDACTED_VALUE } from '../../shared/constants/sensitive-fields';
import { createLogger } from '../../shared/logging/logger';
import type { LogEntry } from '../../shared/types/logging';

describe('logger', () => {
  it('redacts sensitive fields recursively', () => {
    const entries: LogEntry[] = [];
    const logger = createLogger({
      minimumLevel: 'debug',
      sink: (entry) => entries.push(entry),
    });

    logger.info('safe event', {
      actorId: 'internal-user-id',
      openId: 'open-id-value',
      profile: {
        phone: '13800000000',
        email: 'person@example.com',
        displayName: '可以记录',
      },
      authToken: 'token-value',
    });

    expect(entries).toEqual([
      {
        level: 'info',
        message: 'safe event',
        context: {
          actorId: 'internal-user-id',
          openId: REDACTED_VALUE,
          profile: {
            phone: REDACTED_VALUE,
            email: REDACTED_VALUE,
            displayName: '可以记录',
          },
          authToken: REDACTED_VALUE,
        },
      },
    ]);
  });

  it('filters entries below the configured minimum level', () => {
    const entries: LogEntry[] = [];
    const logger = createLogger({
      minimumLevel: 'warn',
      sink: (entry) => entries.push(entry),
    });

    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');

    expect(entries).toHaveLength(1);
    expect(entries[0]?.level).toBe('warn');
  });

  it('redacts key material and does not serialize exception stacks', () => {
    const entries: LogEntry[] = [];
    const logger = createLogger({
      minimumLevel: 'debug',
      sink: (entry) => entries.push(entry),
    });

    logger.error('configuration failed', {
      privateKey: 'private-key-value',
      apiKey: 'api-key-value',
      cloudEnvId: 'cloud-environment-id',
      cause: new Error('internal stack detail'),
    });

    const serialized = JSON.stringify(entries);

    expect(serialized).not.toContain('private-key-value');
    expect(serialized).not.toContain('api-key-value');
    expect(serialized).not.toContain('cloud-environment-id');
    expect(serialized).not.toContain('internal stack detail');
    expect(serialized).not.toContain('stack');
  });
});
