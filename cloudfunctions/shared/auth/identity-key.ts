import { createHmac } from 'node:crypto';

import { AuthServiceError } from './auth-service-error';

const IDENTITY_KEY_NAMESPACE = 'wechat-openid:v1:';

export function deriveIdentityKey(openId: string, environmentSpecificSecret: string): string {
  if (openId.trim().length === 0) {
    throw new AuthServiceError('AUTH_REQUIRED');
  }

  if (environmentSpecificSecret.trim().length === 0) {
    throw new AuthServiceError('SERVICE_UNAVAILABLE');
  }

  return createHmac('sha256', environmentSpecificSecret)
    .update(`${IDENTITY_KEY_NAMESPACE}${openId}`)
    .digest('hex');
}
