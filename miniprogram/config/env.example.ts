import type { AppEnvironment } from '../shared/types/environment';

type ConfigurableEnvironment = Exclude<AppEnvironment, 'local'>;

export const EXAMPLE_CLOUD_ENVIRONMENT_IDS: Readonly<Record<ConfigurableEnvironment, string>> = {
  development: 'replace-with-development-cloud-env-id',
  staging: 'replace-with-staging-cloud-env-id',
  production: 'replace-with-production-cloud-env-id',
};

// M1.1 只展示配置形状。真实环境 ID 不得写入仓库。
