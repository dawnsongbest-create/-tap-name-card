import { describe, expect, it } from 'vitest';

import { createFailureResult, createSuccessResult } from '../../shared/cloud-function-result';
import type { CurrentUserView } from '../../shared/types/user';
import {
  createAnonymousAuthState,
  createLoadingAuthState,
  mapAuthResultToState,
} from '../../miniprogram/state/auth';

const activeUser: CurrentUserView = {
  userId: 'user-local',
  status: 'ACTIVE',
  needsPolicyAcceptance: true,
  createdAt: '2026-07-25T00:00:00.000Z',
};

describe('client auth state', () => {
  it('has explicit anonymous and loading states', () => {
    expect(createAnonymousAuthState()).toEqual({ kind: 'ANONYMOUS' });
    expect(createLoadingAuthState()).toEqual({ kind: 'LOADING' });
  });

  it('maps active and restricted views without a remote DELETED view', () => {
    expect(mapAuthResultToState(createSuccessResult(activeUser, 'req-1')).kind).toBe(
      'AUTHENTICATED',
    );
    expect(
      mapAuthResultToState(createSuccessResult({ ...activeUser, status: 'RESTRICTED' }, 'req-2'))
        .kind,
    ).toBe('RESTRICTED');
  });

  it('maps ACCOUNT_DELETED to a local terminal state', () => {
    expect(mapAuthResultToState(createFailureResult('ACCOUNT_DELETED', 'req-3'))).toEqual({
      kind: 'DELETED',
    });
  });

  it('maps missing identity to anonymous and service failures to unavailable', () => {
    expect(mapAuthResultToState(createFailureResult('AUTH_REQUIRED', 'req-4'))).toEqual({
      kind: 'ANONYMOUS',
    });
    expect(mapAuthResultToState(createFailureResult('SERVICE_UNAVAILABLE', 'req-5'))).toEqual({
      kind: 'UNAVAILABLE',
      errorCode: 'SERVICE_UNAVAILABLE',
    });
  });
});
