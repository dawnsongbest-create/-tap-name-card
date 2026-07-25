import type { CloudFunctionResult } from '../shared/types/cloud-function';
import type { CurrentUserView } from '../shared/types/user';

export type AuthSessionState =
  | { kind: 'ANONYMOUS' }
  | { kind: 'LOADING' }
  | { kind: 'AUTHENTICATED'; user: CurrentUserView & { status: 'ACTIVE' } }
  | { kind: 'RESTRICTED'; user: CurrentUserView & { status: 'RESTRICTED' } }
  | { kind: 'DELETED' }
  | { kind: 'UNAVAILABLE'; errorCode: string };

export function createAnonymousAuthState(): AuthSessionState {
  return { kind: 'ANONYMOUS' };
}

export function createLoadingAuthState(): AuthSessionState {
  return { kind: 'LOADING' };
}

export function mapAuthResultToState(
  result: CloudFunctionResult<CurrentUserView>,
): AuthSessionState {
  if (!result.success || !result.data) {
    switch (result.error?.code) {
      case 'ACCOUNT_DELETED':
        return { kind: 'DELETED' };
      case 'AUTH_REQUIRED':
      case 'USER_NOT_FOUND':
        return { kind: 'ANONYMOUS' };
      default:
        return {
          kind: 'UNAVAILABLE',
          errorCode: result.error?.code ?? 'UNKNOWN_ERROR',
        };
    }
  }

  if (result.data.status === 'RESTRICTED') {
    return {
      kind: 'RESTRICTED',
      user: result.data as CurrentUserView & { status: 'RESTRICTED' },
    };
  }

  return {
    kind: 'AUTHENTICATED',
    user: result.data as CurrentUserView & { status: 'ACTIVE' },
  };
}
