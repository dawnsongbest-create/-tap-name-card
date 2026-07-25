import type { AppEnvironment, EnvironmentConfig } from '../shared/types/environment';
import { parseAppEnvironment } from '../shared/validation/environment';

const DEVELOPMENT_CLOUD_ENV_ID = 'cloud1-d1gh2crj26320f882';
const CURRENT_ENVIRONMENT_NAME = 'development';

export const CURRENT_ENVIRONMENT = parseAppEnvironment(CURRENT_ENVIRONMENT_NAME);

export const ENVIRONMENT_CONFIGS: Readonly<Record<AppEnvironment, EnvironmentConfig>> = {
  local: {
    name: 'local',
    cloudEnabled: false,
  },
  development: {
    name: 'development',
    cloudEnabled: true,
    cloudEnvId: DEVELOPMENT_CLOUD_ENV_ID,
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
