import { createFailureResult } from '../shared/cloud-function-result';
import type {
  CloudFunctionCaller,
  CloudFunctionRequest,
  CloudFunctionResult,
} from '../shared/types/cloud-function';

export function createUnconfiguredCloudFunctionCaller(): CloudFunctionCaller {
  return {
    call<TInput, TOutput>(
      request: CloudFunctionRequest<TInput>,
    ): Promise<CloudFunctionResult<TOutput>> {
      return Promise.resolve(
        createFailureResult<TOutput>('SERVICE_UNAVAILABLE', request.requestId),
      );
    },
  };
}
