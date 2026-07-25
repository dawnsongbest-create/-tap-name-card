import type {
  AccountAcceptPoliciesInput,
  AccountAcceptPoliciesOutput,
  AccountGetMeInput,
  AccountGetMeOutput,
  AuthEnsureUserInput,
  AuthEnsureUserOutput,
} from '../shared/types/auth';
import type { CloudFunctionCaller, CloudFunctionResult } from '../shared/types/cloud-function';
import type { RequestIdProvider } from '../shared/types/request-id';

export interface AuthApi {
  ensureUser(): Promise<CloudFunctionResult<AuthEnsureUserOutput>>;
  getMe(): Promise<CloudFunctionResult<AccountGetMeOutput>>;
  acceptPolicies(
    input: AccountAcceptPoliciesInput,
  ): Promise<CloudFunctionResult<AccountAcceptPoliciesOutput>>;
}

export function createAuthApi(caller: CloudFunctionCaller, requestIds: RequestIdProvider): AuthApi {
  return {
    ensureUser: () =>
      caller.call<AuthEnsureUserInput, AuthEnsureUserOutput>({
        name: 'authEnsureUser',
        input: {},
        requestId: requestIds.create(),
      }),
    getMe: () =>
      caller.call<AccountGetMeInput, AccountGetMeOutput>({
        name: 'accountGetMe',
        input: {},
        requestId: requestIds.create(),
      }),
    acceptPolicies: (input) =>
      caller.call<AccountAcceptPoliciesInput, AccountAcceptPoliciesOutput>({
        name: 'accountAcceptPolicies',
        input,
        requestId: requestIds.create(),
      }),
  };
}
