import type { PolicyVersions } from '../types/auth';

export function validatePolicyVersions(versions: PolicyVersions): void {
  if (versions.terms.trim().length === 0 || versions.privacy.trim().length === 0) {
    throw new Error('Current policy versions must be configured.');
  }
}

export function needsPolicyAcceptance(
  user: {
    acceptedTermsVersion?: string;
    acceptedPrivacyVersion?: string;
  },
  currentVersions: PolicyVersions,
): boolean {
  return (
    user.acceptedTermsVersion !== currentVersions.terms ||
    user.acceptedPrivacyVersion !== currentVersions.privacy
  );
}
