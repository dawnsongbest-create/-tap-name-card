export type AppEnvironment = 'local' | 'development' | 'staging' | 'production';

export interface EnvironmentConfig {
  name: AppEnvironment;
  cloudEnabled: boolean;
  cloudEnvId?: string;
}
