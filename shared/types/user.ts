export type CurrentUserStatus = 'ACTIVE' | 'RESTRICTED';

export interface CurrentUserView {
  userId: string;
  status: CurrentUserStatus;
  currentCardId?: string;
  acceptedTermsVersion?: string;
  acceptedPrivacyVersion?: string;
  needsPolicyAcceptance: boolean;
  createdAt: string;
}
