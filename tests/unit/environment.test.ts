import { describe, expect, it } from 'vitest';

import {
  ENVIRONMENT_CONFIGS,
  getEnvironmentConfig,
  getEnvironmentSummary,
} from '../../miniprogram/config/env';
import { isAppEnvironment, parseAppEnvironment } from '../../shared/validation/environment';

describe('environment configuration', () => {
  it('enables only the approved development CloudBase environment', () => {
    expect(Object.keys(ENVIRONMENT_CONFIGS)).toEqual([
      'local',
      'development',
      'staging',
      'production',
    ]);

    expect(ENVIRONMENT_CONFIGS.development).toEqual({
      name: 'development',
      cloudEnabled: true,
      cloudEnvId: 'cloud1-d1gh2crj26320f882',
    });
    expect(ENVIRONMENT_CONFIGS.local).toEqual({
      name: 'local',
      cloudEnabled: false,
    });
    expect(ENVIRONMENT_CONFIGS.staging).toEqual({
      name: 'staging',
      cloudEnabled: false,
    });
    expect(ENVIRONMENT_CONFIGS.production).toEqual({
      name: 'production',
      cloudEnabled: false,
    });
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

  it('selects development as the checked-in runtime environment', () => {
    expect(getEnvironmentSummary()).toEqual({
      environment: 'development',
      cloudConfigured: true,
    });
  });
});
