import type { AppEnvironment, EnvironmentConfig } from '../shared/types/environment';
import { parseAppEnvironment } from '../shared/validation/environment';

const CURRENT_ENVIRONMENT_NAME = 'local';

export const CURRENT_ENVIRONMENT = parseAppEnvironment(CURRENT_ENVIRONMENT_NAME);

export const ENVIRONMENT_CONFIGS: Readonly<Record<AppEnvironment, EnvironmentConfig>> = {
  local: {
    name: 'local',
    cloudEnabled: false,
  },
  development: {
    name: 'development',
    cloudEnabled: false,
  },
  staging: {
    name: 'staging',
    cloudEnabled: false,
  },
  production: {
    name: 'production',
    cloudEnabled: false,
  },
};

export function getEnvironmentConfig(
  environment: AppEnvironment = CURRENT_ENVIRONMENT,
): EnvironmentConfig {
  return ENVIRONMENT_CONFIGS[environment];
}

export function getEnvironmentSummary(environment = CURRENT_ENVIRONMENT): {
  environment: AppEnvironment;
  cloudConfigured: boolean;
} {
  const config = getEnvironmentConfig(environment);

  return {
    environment: config.name,
    cloudConfigured: config.cloudEnabled && Boolean(config.cloudEnvId),
  };
}
