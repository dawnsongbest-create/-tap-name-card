import type { AccountAcceptPoliciesInput } from '../types/auth';

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function parseEmptyAuthInput(value: unknown): Record<string, never> {
  if (!isPlainObject(value) || Object.keys(value).length > 0) {
    throw new Error('Expected an empty input object.');
  }

  return {};
}

export function parseAccountAcceptPoliciesInput(value: unknown): AccountAcceptPoliciesInput {
  if (!isPlainObject(value)) {
    throw new Error('Expected a policy acceptance object.');
  }

  const allowedKeys = new Set(['acceptedTermsVersion', 'acceptedPrivacyVersion']);

  if (Object.keys(value).some((key) => !allowedKeys.has(key))) {
    throw new Error('Policy acceptance contains unsupported fields.');
  }

  const acceptedTermsVersion = value.acceptedTermsVersion;
  const acceptedPrivacyVersion = value.acceptedPrivacyVersion;

  if (
    typeof acceptedTermsVersion !== 'string' ||
    acceptedTermsVersion.trim().length === 0 ||
    typeof acceptedPrivacyVersion !== 'string' ||
    acceptedPrivacyVersion.trim().length === 0
  ) {
    throw new Error('Both policy versions are required.');
  }

  return {
    acceptedTermsVersion: acceptedTermsVersion.trim(),
    acceptedPrivacyVersion: acceptedPrivacyVersion.trim(),
  };
}
