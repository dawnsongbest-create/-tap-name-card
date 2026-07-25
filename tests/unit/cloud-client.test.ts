import { describe, expect, it } from 'vitest';

import {
  createCloudFunctionCallerForEnvironment,
  createWxCloudFunctionCaller,
  initializeCloudForEnvironment,
  type MiniProgramCloudApi,
} from '../../miniprogram/services/cloud';
import type { EnvironmentConfig } from '../../shared/types/environment';

const DEVELOPMENT_CONFIG: EnvironmentConfig = {
  name: 'development',
  cloudEnabled: true,
  cloudEnvId: 'cloud1-d1gh2crj26320f882',
};

class RecordingCloudApi implements MiniProgramCloudApi {
  readonly initCalls: Array<{ env: string }> = [];
  readonly functionCalls: Array<{
    name: string;
    data: { input: unknown; requestId: string };
  }> = [];
  result: unknown = {
    success: true,
    data: { userId: 'user-safe' },
    requestId: 'req-server',
  };
  initError: Error | undefined;
  callError: Error | undefined;

  init(options: { env: string }): void {
    this.initCalls.push(options);

    if (this.initError) {
      throw this.initError;
    }
  }

  callFunction(options: {
    name: string;
    data: { input: unknown; requestId: string };
  }): Promise<{ result?: unknown }> {
    this.functionCalls.push(options);

    if (this.callError) {
      return Promise.reject(this.callError);
    }

    return Promise.resolve({ result: this.result });
  }
}

describe('WeChat Cloud client adapter', () => {
  it('initializes the explicit development environment without calling identity functions', () => {
    const cloudApi = new RecordingCloudApi();

    expect(initializeCloudForEnvironment(DEVELOPMENT_CONFIG, cloudApi)).toBe(true);
    expect(cloudApi.initCalls).toEqual([{ env: 'cloud1-d1gh2crj26320f882' }]);
    expect(cloudApi.functionCalls).toEqual([]);
  });

  it('keeps local as a safe unconfigured environment', async () => {
    const cloudApi = new RecordingCloudApi();
    const localConfig: EnvironmentConfig = {
      name: 'local',
      cloudEnabled: false,
    };

    expect(initializeCloudForEnvironment(localConfig, cloudApi)).toBe(false);
    const result = await createCloudFunctionCallerForEnvironment(localConfig, cloudApi).call({
      name: 'authEnsureUser',
      input: {},
      requestId: 'req-local',
    });

    expect(result.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(cloudApi.initCalls).toEqual([]);
    expect(cloudApi.functionCalls).toEqual([]);
  });

  it('safely degrades when CloudBase initialization fails', () => {
    const cloudApi = new RecordingCloudApi();
    cloudApi.initError = new Error('synthetic platform detail');

    expect(initializeCloudForEnvironment(DEVELOPMENT_CONFIG, cloudApi)).toBe(false);
    expect(cloudApi.functionCalls).toEqual([]);
  });

  it('passes only function name, business input and requestId to callFunction', async () => {
    const cloudApi = new RecordingCloudApi();
    const caller = createWxCloudFunctionCaller(cloudApi);
    const result = await caller.call({
      name: 'accountAcceptPolicies',
      input: {
        acceptedTermsVersion: '1.0.0',
        acceptedPrivacyVersion: '1.0.0',
      },
      requestId: 'req-client',
    });

    expect(cloudApi.functionCalls).toEqual([
      {
        name: 'accountAcceptPolicies',
        data: {
          input: {
            acceptedTermsVersion: '1.0.0',
            acceptedPrivacyVersion: '1.0.0',
          },
          requestId: 'req-client',
        },
      },
    ]);
    expect(result).toEqual({
      success: true,
      data: { userId: 'user-safe' },
      requestId: 'req-server',
    });
    expect(JSON.stringify(cloudApi.functionCalls)).not.toMatch(/openId|userId|operationId/u);
  });

  it('maps transport failures and untrusted error payloads to a safe result', async () => {
    const cloudApi = new RecordingCloudApi();
    cloudApi.callError = new Error('contains synthetic-open-id and platform internals');
    const transportFailure = await createWxCloudFunctionCaller(cloudApi).call({
      name: 'accountGetMe',
      input: {},
      requestId: 'req-transport',
    });

    cloudApi.callError = undefined;
    cloudApi.result = {
      success: false,
      error: {
        code: 'UNTRUSTED_PLATFORM_CODE',
        message: 'contains synthetic-open-id',
      },
      requestId: 'req-untrusted',
    };
    const payloadFailure = await createWxCloudFunctionCaller(cloudApi).call({
      name: 'accountGetMe',
      input: {},
      requestId: 'req-payload',
    });

    expect(transportFailure.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(payloadFailure.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify([transportFailure, payloadFailure])).not.toContain('synthetic-open-id');
  });

  it('does not accept an unsafe server requestId into client state', async () => {
    const cloudApi = new RecordingCloudApi();
    cloudApi.result = {
      success: false,
      error: {
        code: 'AUTH_REQUIRED',
      },
      requestId: 'synthetic-open-id\nforged-log-entry',
    };

    const result = await createWxCloudFunctionCaller(cloudApi).call({
      name: 'accountGetMe',
      input: {},
      requestId: 'req-safe-fallback',
    });

    expect(result.requestId).toBe('req-safe-fallback');
    expect(JSON.stringify(result)).not.toContain('synthetic-open-id');
  });
});
