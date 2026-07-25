import type { TrustedIdentityProvider } from '../auth/trusted-identity-provider';
import type { TrustedWxContextReader } from './wx-cloud-types';

export class TrustedMiniProgramAppIdMismatchError extends Error {
  constructor() {
    super('Trusted Mini Program context does not match the configured application.');
    this.name = 'TrustedMiniProgramAppIdMismatchError';
  }
}

export class WxTrustedIdentityProvider implements TrustedIdentityProvider {
  constructor(
    private readonly readContext: TrustedWxContextReader,
    private readonly expectedAppId: string,
  ) {}

  async getOpenId(): Promise<string | undefined> {
    const context = this.readContext();
    const openId = typeof context.OPENID === 'string' ? context.OPENID.trim() : '';

    if (!openId) {
      return undefined;
    }

    const appId = typeof context.APPID === 'string' ? context.APPID.trim() : '';

    if (!appId || appId !== this.expectedAppId) {
      throw new TrustedMiniProgramAppIdMismatchError();
    }

    return openId;
  }
}
