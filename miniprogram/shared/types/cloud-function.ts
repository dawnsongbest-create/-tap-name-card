import type { ErrorCode } from '../errors/error-code';

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

export interface CloudFunctionRequest<TInput> {
  name: string;
  input: TInput;
  requestId: string;
}

export interface CloudFunctionCaller {
  call<TInput, TOutput>(
    request: CloudFunctionRequest<TInput>,
  ): Promise<CloudFunctionResult<TOutput>>;
}
