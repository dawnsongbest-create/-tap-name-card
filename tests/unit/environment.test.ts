import { describe, expect, it } from 'vitest';

import {
  ENVIRONMENT_CONFIGS,
  getEnvironmentConfig,
  getEnvironmentSummary,
} from '../../miniprogram/config/env';
import { isAppEnvironment, parseAppEnvironment } from '../../shared/validation/environment';

describe('environment configuration', () => {
  it('defines all four environments without real CloudBase IDs', () => {
    expect(Object.keys(ENVIRONMENT_CONFIGS)).toEqual([
      'local',
      'development',
      'staging',
      'production',
    ]);

    for (const config of Object.values(ENVIRONMENT_CONFIGS)) {
      expect(config.cloudEnabled).toBe(false);
      expect(config.cloudEnvId).toBeUndefined();
    }
  });

  it('validates known environment names', () => {
    expect(isAppEnvironment('staging')).toBe(true);
    expect(isAppEnvironment('preview')).toBe(false);
    expect(parseAppEnvironment('production')).toBe('production');
    expect(() => parseAppEnvironment('preview')).toThrow('Unsupported application environment');
  });

  it('reports an unconfigured cloud environment without throwing', () => {
    expect(getEnvironmentConfig('local')).toEqual({
      name: 'local',
      cloudEnabled: false,
    });
    expect(getEnvironmentSummary('local')).toEqual({
      environment: 'local',
      cloudConfigured: false,
    });
  });
});
