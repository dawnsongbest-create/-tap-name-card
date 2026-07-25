export type UserStatus = 'ACTIVE' | 'RESTRICTED' | 'DELETED';

export interface UserRecord {
  _id: string;
  openId: string;
  status: UserStatus;
  currentCardId?: string;
  acceptedTermsVersion?: string;
  acceptedPrivacyVersion?: string;
  termsAcceptedAt?: Date;
  privacyAcceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface IdentityMapping {
  userId: string;
  provider: 'WECHAT_MINIPROGRAM';
  createdAt: Date;
}
