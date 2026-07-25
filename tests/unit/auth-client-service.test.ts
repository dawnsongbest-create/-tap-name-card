import { describe, expect, it } from 'vitest';

import { createAuthApi } from '../../miniprogram/services/auth';
import { createFailureResult } from '../../shared/cloud-function-result';
import type {
  CloudFunctionCaller,
  CloudFunctionRequest,
  CloudFunctionResult,
} from '../../shared/types/cloud-function';
import type { RequestIdProvider } from '../../shared/types/request-id';

class RecordingCloudFunctionCaller implements CloudFunctionCaller {
  readonly requests: CloudFunctionRequest<unknown>[] = [];

  call<TInput, TOutput>(
    request: CloudFunctionRequest<TInput>,
  ): Promise<CloudFunctionResult<TOutput>> {
    this.requests.push(request);
    return Promise.resolve(createFailureResult<TOutput>('SERVICE_UNAVAILABLE', request.requestId));
  }
}

describe('client auth service boundary', () => {
  it('keeps the three identity calls independent and sends no client identity', async () => {
    const caller = new RecordingCloudFunctionCaller();
    let nextRequestId = 1;
    const requestIds: RequestIdProvider = {
      create: () => `req-client-${nextRequestId++}`,
    };
    const api = createAuthApi(caller, requestIds);

    await api.ensureUser();
    await api.getMe();
    await api.acceptPolicies({
      acceptedTermsVersion: 'terms-v1',
      acceptedPrivacyVersion: 'privacy-v1',
    });

    expect(caller.requests).toEqual([
      {
        name: 'authEnsureUser',
        input: {},
        requestId: 'req-client-1',
      },
      {
        name: 'accountGetMe',
        input: {},
        requestId: 'req-client-2',
      },
      {
        name: 'accountAcceptPolicies',
        input: {
          acceptedTermsVersion: 'terms-v1',
          acceptedPrivacyVersion: 'privacy-v1',
        },
        requestId: 'req-client-3',
      },
    ]);

    const serializedRequests = JSON.stringify(caller.requests);
    expect(serializedRequests).not.toContain('openId');
    expect(serializedRequests).not.toContain('userId');
    expect(serializedRequests).not.toContain('operationId');
  });
});
