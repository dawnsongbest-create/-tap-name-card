import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  createDevelopmentPolicyProbeView,
  getDevelopmentPolicyAcceptanceInput,
} from '../../miniprogram/pages/foundation/policy-probe';
import type { CloudFunctionResult } from '../../shared/types/cloud-function';
import type { EnvironmentConfig } from '../../shared/types/environment';
import type { AccountAcceptPoliciesOutput } from '../../shared/types/auth';

const DEVELOPMENT_CONFIG: EnvironmentConfig = {
  name: 'development',
  cloudEnabled: true,
  cloudEnvId: 'cloud1-d1gh2crj26320f882',
};

describe('foundation development policy probe', () => {
  it('is available only for a configured development environment', () => {
    const disabledConfigs: EnvironmentConfig[] = [
      { name: 'local', cloudEnabled: false },
      { name: 'development', cloudEnabled: false },
      { name: 'staging', cloudEnabled: false },
      { name: 'production', cloudEnabled: false },
    ];

    expect(getDevelopmentPolicyAcceptanceInput(DEVELOPMENT_CONFIG)).toEqual({
      acceptedTermsVersion: 'v1',
      acceptedPrivacyVersion: 'v1',
    });

    for (const config of disabledConfigs) {
      expect(getDevelopmentPolicyAcceptanceInput(config)).toBeUndefined();
    }
  });

  it('projects only the approved safe policy result fields', () => {
    const result = {
      success: true,
      data: {
        replayed: false,
        user: {
          userId: 'user-safe',
          status: 'ACTIVE',
          acceptedTermsVersion: 'v1',
          acceptedPrivacyVersion: 'v1',
          needsPolicyAcceptance: false,
          createdAt: '2026-07-26T00:00:00.000Z',
          openId: 'synthetic-open-id',
          identityKey: 'synthetic-identity-key',
          termsAcceptedAt: 'synthetic-acceptance-time',
          privacyAcceptedAt: 'synthetic-acceptance-time',
        },
        hmacSecret: 'synthetic-hmac-secret',
      },
      requestId: 'req-policy-first',
    } as unknown as CloudFunctionResult<AccountAcceptPoliciesOutput>;

    const view = createDevelopmentPolicyProbeView(result);

    expect(view).toEqual({
      resultStatus: 'SUCCESS',
      clientState: 'AUTHENTICATED',
      needsPolicyAcceptance: 'false',
      acceptedTermsVersion: 'v1',
      acceptedPrivacyVersion: 'v1',
      requestId: 'req-policy-first',
      replayed: 'false',
    });
    expect(JSON.stringify(view)).not.toMatch(
      /openId|identityKey|hmac|termsAcceptedAt|privacyAcceptedAt|synthetic-acceptance-time/u,
    );
  });

  it('keeps failure output safe and repeatable calls visible', () => {
    const failure: CloudFunctionResult<AccountAcceptPoliciesOutput> = {
      success: false,
      error: {
        code: 'SERVICE_UNAVAILABLE',
        message: 'safe client message',
        details: {
          openId: 'synthetic-open-id',
          stack: 'synthetic-internal-stack',
        },
      },
      requestId: 'req-policy-failure',
    };

    const view = createDevelopmentPolicyProbeView(failure);

    expect(view).toEqual({
      resultStatus: 'FAILED',
      clientState: 'UNAVAILABLE',
      needsPolicyAcceptance: '—',
      acceptedTermsVersion: '—',
      acceptedPrivacyVersion: '—',
      requestId: 'req-policy-failure',
      replayed: '—',
    });
    expect(JSON.stringify(view)).not.toMatch(/synthetic-open-id|synthetic-internal-stack/u);
  });

  it('renders a manual-only button and never adds policy confirmation to app launch', () => {
    const repositoryRoot = process.cwd();
    const pageSource = readFileSync(
      resolve(repositoryRoot, 'miniprogram/pages/foundation/index.ts'),
      'utf8',
    );
    const pageTemplate = readFileSync(
      resolve(repositoryRoot, 'miniprogram/pages/foundation/index.wxml'),
      'utf8',
    );
    const appSource = readFileSync(resolve(repositoryRoot, 'miniprogram/app.ts'), 'utf8');

    expect(pageTemplate).toContain('wx:if="{{showDevelopmentPolicyProbe}}"');
    expect(pageTemplate).toContain('确认 v1/v1 政策');
    expect(pageTemplate).toContain('bindtap="onAcceptV1Policies"');
    expect(pageTemplate).toContain('运行身份与政策自动验收');
    expect(pageTemplate).toContain('并发 ensure ×20');
    expect(pageTemplate).toContain('运行数据库权限负向验收');
    expect(pageTemplate.split('wx:if="{{showDevelopmentPolicyProbe}}"')).toHaveLength(5);
    expect(pageSource).toContain('authApi.acceptPolicies(developmentPolicyAcceptanceInput)');
    expect(appSource).not.toContain('accountAcceptPolicies');
    expect(appSource).not.toContain('acceptPolicies');
  });
});
