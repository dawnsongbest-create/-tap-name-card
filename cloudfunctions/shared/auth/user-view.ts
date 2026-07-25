import type { PolicyVersions } from '../contracts/types/auth';
import type { CurrentUserView } from '../contracts/types/user';
import { needsPolicyAcceptance } from '../contracts/validation/policies';
import type { UserRecord } from '../db/records';
import { AuthServiceError } from './auth-service-error';

export function toCurrentUserView(
  user: UserRecord,
  currentPolicyVersions: PolicyVersions,
): CurrentUserView {
  if (user.status === 'DELETED') {
    throw new AuthServiceError('ACCOUNT_DELETED');
  }

  return {
    userId: user._id,
    status: user.status,
    ...(user.currentCardId ? { currentCardId: user.currentCardId } : {}),
    ...(user.acceptedTermsVersion ? { acceptedTermsVersion: user.acceptedTermsVersion } : {}),
    ...(user.acceptedPrivacyVersion ? { acceptedPrivacyVersion: user.acceptedPrivacyVersion } : {}),
    needsPolicyAcceptance: needsPolicyAcceptance(user, currentPolicyVersions),
    createdAt: user.createdAt.toISOString(),
  };
}
