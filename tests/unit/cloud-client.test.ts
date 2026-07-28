import { describe, expect, it, vi } from 'vitest';

import {
  createCloudFunctionCallerForEnvironment,
  createWxCloudFunctionCaller,
  initializeCloudForEnvironment,
  type MiniProgramCloudApi,
} from '../../miniprogram/services/cloud';
import { SAFE_ERROR_MESSAGES, type ErrorCode } from '../../shared/errors/error-code';
import type { EnvironmentConfig } from '../../shared/types/environment';
import { parseObject, parseString } from '../../shared/validation/runtime';

interface UserIdOutput {
  userId: string;
}

function parseUserIdOutput(value: unknown): UserIdOutput {
  const input = parseObject(value);

  return {
    userId: parseString(input.userId),
  };
}

const DEVELOPMENT_CONFIG: EnvironmentConfig = {
  name: 'development',
  cloudEnabled: true,
  cloudEnvId: 'cloud1-d1gh2crj26320f882',
};

const REMOTE_SECRET_PATTERN =
  /synthetic-remote-message|synthetic-remote-details|synthetic-remote-stack|synthetic-unknown-field|synthetic primitive response/u;

interface MalformedEnvelopeCase {
  label: string;
  response: unknown;
  expectedCode?: ErrorCode;
  expectedRequestId?: string;
}

const MALFORMED_ENVELOPE_CASES: readonly MalformedEnvelopeCase[] = [
  {
    label: 'null response',
    response: null,
  },
  {
    label: 'array response',
    response: ['synthetic-unknown-field'],
  },
  {
    label: 'primitive response',
    response: 'synthetic primitive response',
  },
  {
    label: 'missing success',
    response: {
      requestId: 'req-missing-success',
      message: 'synthetic-remote-message',
      details: 'synthetic-remote-details',
      stack: 'synthetic-remote-stack',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'non-boolean success',
    response: {
      success: 'false',
      requestId: 'req-non-boolean-success',
      message: 'synthetic-remote-message',
      details: 'synthetic-remote-details',
      stack: 'synthetic-remote-stack',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'success without data',
    response: {
      success: true,
      requestId: 'req-success-without-data',
      message: 'synthetic-remote-message',
      details: 'synthetic-remote-details',
      stack: 'synthetic-remote-stack',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'success with error',
    response: {
      success: true,
      data: {
        userId: 'user-safe',
      },
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'synthetic-remote-message',
        details: 'synthetic-remote-details',
        stack: 'synthetic-remote-stack',
      },
      requestId: 'req-success-with-error',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'failure without error',
    response: {
      success: false,
      requestId: 'req-failure-without-error',
      message: 'synthetic-remote-message',
      details: 'synthetic-remote-details',
      stack: 'synthetic-remote-stack',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'failure with non-object error',
    response: {
      success: false,
      error: 'synthetic-remote-message',
      requestId: 'req-failure-non-object-error',
      details: 'synthetic-remote-details',
      stack: 'synthetic-remote-stack',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'failure error without code',
    response: {
      success: false,
      error: {
        message: 'synthetic-remote-message',
        details: 'synthetic-remote-details',
        stack: 'synthetic-remote-stack',
      },
      requestId: 'req-failure-without-code',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'failure error with non-string code',
    response: {
      success: false,
      error: {
        code: 42,
        message: 'synthetic-remote-message',
        details: 'synthetic-remote-details',
        stack: 'synthetic-remote-stack',
      },
      requestId: 'req-failure-non-string-code',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'failure error with unknown code',
    response: {
      success: false,
      error: {
        code: 'UNTRUSTED_PLATFORM_CODE',
        message: 'synthetic-remote-message',
        details: 'synthetic-remote-details',
        stack: 'synthetic-remote-stack',
      },
      requestId: 'req-failure-unknown-code',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'failure error without message',
    response: {
      success: false,
      error: {
        code: 'ACCOUNT_DELETED',
        details: 'synthetic-remote-details',
        stack: 'synthetic-remote-stack',
      },
      requestId: 'req-failure-without-message',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'failure error with non-string message',
    response: {
      success: false,
      error: {
        code: 'ACCOUNT_DELETED',
        message: 42,
        details: 'synthetic-remote-details',
        stack: 'synthetic-remote-stack',
      },
      requestId: 'req-failure-non-string-message',
      unknownField: 'synthetic-unknown-field',
    },
  },
  {
    label: 'failure carrying data',
    response: {
      success: false,
      data: {
        unknownField: 'synthetic-unknown-field',
      },
      error: {
        code: 'ACCOUNT_DELETED',
        message: 'synthetic-remote-message',
        details: 'synthetic-remote-details',
        stack: 'synthetic-remote-stack',
      },
      requestId: 'req-failure-with-data',
    },
  },
  {
    label: 'invalid requestId',
    response: {
      success: false,
      error: {
        code: 'ACCOUNT_DELETED',
        message: 'synthetic-remote-message',
        details: 'synthetic-remote-details',
        stack: 'synthetic-remote-stack',
      },
      requestId: 'synthetic-unknown-field\nforged-log-entry',
      unknownField: 'synthetic-unknown-field',
    },
    expectedCode: 'ACCOUNT_DELETED',
    expectedRequestId: 'req-malformed-fallback',
  },
];

class RecordingCloudApi implements MiniProgramCloudApi {
  readonly initCalls: Array<{ env: string }> = [];
  readonly functionCalls: Array<{
    name: string;
    data: { input: unknown; requestId: string };
  }> = [];
  result: unknown = {
    success: true,
    data: {
      userId: 'user-safe',
      openId: 'synthetic-open-id',
    },
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
      parseOutput: parseUserIdOutput,
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
      parseOutput: parseUserIdOutput,
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
    expect(JSON.stringify(result)).not.toContain('synthetic-open-id');
    expect(JSON.stringify(cloudApi.functionCalls)).not.toMatch(/openId|userId|operationId/u);
  });

  it('maps transport failures to a safe result without exposing SDK errors', async () => {
    const cloudApi = new RecordingCloudApi();
    cloudApi.callError = new Error('contains synthetic-open-id and platform internals');
    const transportFailure = await createWxCloudFunctionCaller(cloudApi).call({
      name: 'accountGetMe',
      input: {},
      requestId: 'req-transport',
      parseOutput: parseUserIdOutput,
    });

    expect(transportFailure.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(transportFailure)).not.toMatch(/synthetic-open-id|platform internals/u);
  });

  it('rebuilds known remote failures from the canonical safe error catalog', async () => {
    const cloudApi = new RecordingCloudApi();
    cloudApi.result = {
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: 'synthetic database document path',
        details: {
          openId: 'synthetic-open-id',
        },
        stack: 'synthetic-internal-stack',
      },
      requestId: 'req-known-error',
      sdkResponse: 'synthetic-sdk-response',
    };

    const result = await createWxCloudFunctionCaller(cloudApi).call({
      name: 'templateGet',
      input: {
        templateId: 'missing-template',
      },
      requestId: 'req-known-error-client',
      parseOutput: parseUserIdOutput,
    });

    expect(result).toEqual({
      success: false,
      error: {
        code: 'RESOURCE_NOT_FOUND',
        message: '这项内容已经不存在了。',
      },
      requestId: 'req-known-error',
    });
    expect(JSON.stringify(result)).not.toMatch(
      /synthetic database|synthetic-open-id|synthetic-internal-stack|synthetic-sdk-response/u,
    );
  });

  it.each(MALFORMED_ENVELOPE_CASES)(
    'fails closed for malformed envelope: $label',
    async ({ response, expectedCode = 'SERVICE_UNAVAILABLE', expectedRequestId }) => {
      const cloudApi = new RecordingCloudApi();
      cloudApi.result = response;
      const parseOutput = vi.fn(parseUserIdOutput);

      const result = await createWxCloudFunctionCaller(cloudApi).call({
        name: 'accountGetMe',
        input: {},
        requestId: 'req-malformed-fallback',
        parseOutput,
      });

      expect(result).toMatchObject({
        success: false,
        error: {
          code: expectedCode,
          message: SAFE_ERROR_MESSAGES[expectedCode],
        },
      });
      expect(result.requestId).toMatch(/^[A-Za-z0-9_-]{1,128}$/u);

      if (expectedRequestId) {
        expect(result.requestId).toBe(expectedRequestId);
      }

      expect(parseOutput).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toMatch(REMOTE_SECRET_PATTERN);
    },
  );

  it('rejects an invalid success DTO without exposing remote fields', async () => {
    const cloudApi = new RecordingCloudApi();
    const caller = createWxCloudFunctionCaller(cloudApi);

    cloudApi.result = {
      success: true,
      data: {
        userId: 42,
        openId: 'synthetic-open-id',
      },
      requestId: 'req-invalid-data',
    };
    const invalidData = await caller.call({
      name: 'accountGetMe',
      input: {},
      requestId: 'req-client-invalid-data',
      parseOutput: parseUserIdOutput,
    });

    expect(invalidData.error?.code).toBe('SERVICE_UNAVAILABLE');
    expect(JSON.stringify(invalidData)).not.toContain('synthetic-open-id');
  });
});
