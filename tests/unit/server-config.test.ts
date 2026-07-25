import { describe, expect, it } from 'vitest';

import {
  loadCloudFunctionServerConfig,
  ServerConfigurationError,
} from '../../cloudfunctions/shared/platform/server-config';

const COMPLETE_ENVIRONMENT: NodeJS.ProcessEnv = {
  IDENTITY_HMAC_SECRET: 'synthetic-test-secret-at-least-32-bytes',
  EXPECTED_MINIPROGRAM_APP_ID: 'expected-app-id',
  TERMS_VERSION: '1.0.0',
  PRIVACY_VERSION: '1.0.0',
};

describe('cloud function server configuration', () => {
  it('loads all four required values without defaults', () => {
    expect(loadCloudFunctionServerConfig(COMPLETE_ENVIRONMENT)).toEqual({
      identityHmacSecret: 'synthetic-test-secret-at-least-32-bytes',
      expectedMiniProgramAppId: 'expected-app-id',
      currentPolicyVersions: {
        terms: '1.0.0',
        privacy: '1.0.0',
      },
    });
  });

  it.each([
    'IDENTITY_HMAC_SECRET',
    'EXPECTED_MINIPROGRAM_APP_ID',
    'TERMS_VERSION',
    'PRIVACY_VERSION',
  ])('fails safely when %s is missing', (missingName) => {
    const environment = { ...COMPLETE_ENVIRONMENT };
    delete environment[missingName];

    expect(() => loadCloudFunctionServerConfig(environment)).toThrow(ServerConfigurationError);
  });

  it('rejects an undersized HMAC secret instead of accepting a weak runtime fallback', () => {
    expect(() =>
      loadCloudFunctionServerConfig({
        ...COMPLETE_ENVIRONMENT,
        IDENTITY_HMAC_SECRET: 'too-short',
      }),
    ).toThrow(ServerConfigurationError);
  });
});
