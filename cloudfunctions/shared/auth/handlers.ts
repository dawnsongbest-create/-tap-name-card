import { createFailureResult, createSuccessResult } from '../contracts/cloud-function-result';
import type {
  AccountAcceptPoliciesInput,
  AccountAcceptPoliciesOutput,
  AccountGetMeOutput,
  AuthEnsureUserOutput,
} from '../contracts/types/auth';
import type { CloudFunctionResult } from '../contracts/types/cloud-function';
import { parseAccountAcceptPoliciesInput, parseEmptyAuthInput } from '../contracts/validation/auth';
import type { AuthService } from './auth-service';
import { AuthServiceError } from './auth-service-error';

type AuthHandler<TOutput> = (
  input: unknown,
  requestId: string,
) => Promise<CloudFunctionResult<TOutput>>;

async function executeHandler<TOutput>(
  requestId: string,
  operation: () => Promise<TOutput>,
): Promise<CloudFunctionResult<TOutput>> {
  try {
    return createSuccessResult(await operation(), requestId);
  } catch (error) {
    if (error instanceof AuthServiceError) {
      return createFailureResult(error.code, requestId);
    }

    return createFailureResult('UNKNOWN_ERROR', requestId);
  }
}

export function createAuthEnsureUserHandler(
  service: AuthService,
): AuthHandler<AuthEnsureUserOutput> {
  return (input, requestId) =>
    executeHandler(requestId, async () => {
      try {
        parseEmptyAuthInput(input);
      } catch {
        throw new AuthServiceError('INVALID_INPUT');
      }

      return service.ensureUser();
    });
}

export function createAccountGetMeHandler(service: AuthService): AuthHandler<AccountGetMeOutput> {
  return (input, requestId) =>
    executeHandler(requestId, async () => {
      try {
        parseEmptyAuthInput(input);
      } catch {
        throw new AuthServiceError('INVALID_INPUT');
      }

      return service.getMe();
    });
}

export function createAccountAcceptPoliciesHandler(
  service: AuthService,
): AuthHandler<AccountAcceptPoliciesOutput> {
  return (input, requestId) =>
    executeHandler(requestId, async () => {
      let parsedInput: AccountAcceptPoliciesInput;

      try {
        parsedInput = parseAccountAcceptPoliciesInput(input);
      } catch {
        throw new AuthServiceError('INVALID_INPUT');
      }

      return service.acceptPolicies(parsedInput);
    });
}
