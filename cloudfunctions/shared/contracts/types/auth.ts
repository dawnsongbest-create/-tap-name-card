import type { CurrentUserView } from './user';

export type AuthEnsureUserInput = Record<string, never>;
export type AccountGetMeInput = Record<string, never>;

export type AuthEnsureUserOutput = CurrentUserView;
export type AccountGetMeOutput = CurrentUserView;

export interface AccountAcceptPoliciesInput {
  acceptedTermsVersion: string;
  acceptedPrivacyVersion: string;
}

export interface AccountAcceptPoliciesOutput {
  user: CurrentUserView;
  replayed: boolean;
}

export interface PolicyVersions {
  terms: string;
  privacy: string;
}
