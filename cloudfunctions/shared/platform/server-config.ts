import type { PolicyVersions } from '../contracts/types/auth';
import { validatePolicyVersions } from '../contracts/validation/policies';

export interface CloudFunctionServerConfig {
  identityHmacSecret: string;
  expectedMiniProgramAppId: string;
  currentPolicyVersions: PolicyVersions;
}

export class ServerConfigurationError extends Error {
  constructor() {
    super('Required cloud function configuration is unavailable.');
    this.name = 'ServerConfigurationError';
  }
}

function requireValue(environment: NodeJS.ProcessEnv, name: string): string {
  const value = environment[name]?.trim();

  if (!value) {
    throw new ServerConfigurationError();
  }

  return value;
}

function requireIdentityHmacSecret(environment: NodeJS.ProcessEnv): string {
  const secret = requireValue(environment, 'IDENTITY_HMAC_SECRET');

  if (Buffer.byteLength(secret, 'utf8') < 32) {
    throw new ServerConfigurationError();
  }

  return secret;
}

export function loadCloudFunctionServerConfig(
  environment: NodeJS.ProcessEnv,
): CloudFunctionServerConfig {
  const currentPolicyVersions: PolicyVersions = {
    terms: requireValue(environment, 'TERMS_VERSION'),
    privacy: requireValue(environment, 'PRIVACY_VERSION'),
  };

  try {
    validatePolicyVersions(currentPolicyVersions);
  } catch {
    throw new ServerConfigurationError();
  }

  return {
    identityHmacSecret: requireIdentityHmacSecret(environment),
    expectedMiniProgramAppId: requireValue(environment, 'EXPECTED_MINIPROGRAM_APP_ID'),
    currentPolicyVersions,
  };
}
