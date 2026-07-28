import type {
  AccountAcceptPoliciesOutput,
  AccountGetMeOutput,
  AuthEnsureUserOutput,
} from '../types/auth';
import type { CurrentUserView } from '../types/user';
import { parseBoolean, parseEnum, parseObject, parseOptional, parseString } from './runtime';

const CURRENT_USER_STATUSES = ['ACTIVE', 'RESTRICTED'] as const;

function parseCurrentUserView(value: unknown): CurrentUserView {
  const input = parseObject(value);
  const userId = parseString(input.userId);
  const createdAt = parseString(input.createdAt);

  if (userId.length === 0 || createdAt.length === 0) {
    throw new Error('CurrentUserView identifiers and timestamps must not be empty.');
  }

  const currentCardId = parseOptional(input.currentCardId, parseString);
  const acceptedTermsVersion = parseOptional(input.acceptedTermsVersion, parseString);
  const acceptedPrivacyVersion = parseOptional(input.acceptedPrivacyVersion, parseString);
  const result: CurrentUserView = {
    userId,
    status: parseEnum(input.status, CURRENT_USER_STATUSES),
    needsPolicyAcceptance: parseBoolean(input.needsPolicyAcceptance),
    createdAt,
  };

  if (typeof currentCardId !== 'undefined') {
    result.currentCardId = currentCardId;
  }

  if (typeof acceptedTermsVersion !== 'undefined') {
    result.acceptedTermsVersion = acceptedTermsVersion;
  }

  if (typeof acceptedPrivacyVersion !== 'undefined') {
    result.acceptedPrivacyVersion = acceptedPrivacyVersion;
  }

  return result;
}

export function parseAuthEnsureUserOutput(value: unknown): AuthEnsureUserOutput {
  return parseCurrentUserView(value);
}

export function parseAccountGetMeOutput(value: unknown): AccountGetMeOutput {
  return parseCurrentUserView(value);
}

export function parseAccountAcceptPoliciesOutput(value: unknown): AccountAcceptPoliciesOutput {
  const input = parseObject(value);

  return {
    user: parseCurrentUserView(input.user),
    replayed: parseBoolean(input.replayed),
  };
}
