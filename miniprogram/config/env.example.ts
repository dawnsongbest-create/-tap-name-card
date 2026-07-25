import type { AppEnvironment } from '../shared/types/environment';

type ConfigurableEnvironment = Exclude<AppEnvironment, 'local'>;

export const EXAMPLE_CLOUD_ENVIRONMENT_IDS: Readonly<Record<ConfigurableEnvironment, string>> = {
  development: 'cloud1-d1gh2crj26320f882',
  staging: 'replace-with-staging-cloud-env-id',
  production: 'replace-with-production-cloud-env-id',
};

// AppID and EnvId identify project environments; they are not authorization credentials.
// Secrets, OpenID, AppSecret and HMAC keys must never be added here.
