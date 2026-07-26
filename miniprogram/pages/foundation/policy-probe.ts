import type { AuthSessionState } from '../../state/auth';
import { mapAuthResultToState } from '../../state/auth';
import type { CloudFunctionResult } from '../../shared/types/cloud-function';
import type { EnvironmentConfig } from '../../shared/types/environment';
import type {
  AccountAcceptPoliciesInput,
  AccountAcceptPoliciesOutput,
} from '../../shared/types/auth';
import type { CurrentUserView } from '../../shared/types/user';

export interface DevelopmentPolicyProbeView {
  resultStatus: 'SUCCESS' | 'FAILED';
  clientState: AuthSessionState['kind'];
  needsPolicyAcceptance: string;
  acceptedTermsVersion: string;
  acceptedPrivacyVersion: string;
  requestId: string;
  replayed: string;
}

const EMPTY_VALUE = '—';

export function getDevelopmentPolicyAcceptanceInput(
  config: EnvironmentConfig,
): AccountAcceptPoliciesInput | undefined {
  if (config.name !== 'development' || !config.cloudEnabled || !config.cloudEnvId) {
    return undefined;
  }

  return {
    acceptedTermsVersion: 'v1',
    acceptedPrivacyVersion: 'v1',
  };
}

function mapPolicyResultToAuthState(
  result: CloudFunctionResult<AccountAcceptPoliciesOutput>,
): AuthSessionState {
  const userResult: CloudFunctionResult<CurrentUserView> =
    result.success && result.data
      ? {
          success: true,
          data: result.data.user,
          requestId: result.requestId,
        }
      : {
          success: false,
          error: result.error,
          requestId: result.requestId,
        };

  return mapAuthResultToState(userResult);
}

export function createDevelopmentPolicyProbeView(
  result: CloudFunctionResult<AccountAcceptPoliciesOutput>,
): DevelopmentPolicyProbeView {
  const clientState = mapPolicyResultToAuthState(result).kind;

  if (!result.success || !result.data) {
    return {
      resultStatus: 'FAILED',
      clientState,
      needsPolicyAcceptance: EMPTY_VALUE,
      acceptedTermsVersion: EMPTY_VALUE,
      acceptedPrivacyVersion: EMPTY_VALUE,
      requestId: result.requestId,
      replayed: EMPTY_VALUE,
    };
  }

  return {
    resultStatus: 'SUCCESS',
    clientState,
    needsPolicyAcceptance: String(result.data.user.needsPolicyAcceptance),
    acceptedTermsVersion: result.data.user.acceptedTermsVersion ?? EMPTY_VALUE,
    acceptedPrivacyVersion: result.data.user.acceptedPrivacyVersion ?? EMPTY_VALUE,
    requestId: result.requestId,
    replayed: String(result.data.replayed),
  };
}
