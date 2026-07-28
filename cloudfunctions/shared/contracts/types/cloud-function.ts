import type { ErrorCode } from '../errors/error-code';
import type { RuntimeParser } from '../validation/runtime';

export interface CloudFunctionError {
  code: ErrorCode;
  message: string;
  field?: string;
  details?: Record<string, unknown>;
}

export interface CloudFunctionResult<T> {
  success: boolean;
  data?: T;
  error?: CloudFunctionError;
  requestId: string;
}

export interface CloudFunctionRequest<TInput, TOutput> {
  name: string;
  input: TInput;
  requestId: string;
  parseOutput: RuntimeParser<TOutput>;
}

export interface CloudFunctionCaller {
  call<TInput, TOutput>(
    request: CloudFunctionRequest<TInput, TOutput>,
  ): Promise<CloudFunctionResult<TOutput>>;
}
