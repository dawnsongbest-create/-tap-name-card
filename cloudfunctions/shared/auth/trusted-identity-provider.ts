export interface TrustedIdentityProvider {
  getOpenId(): Promise<string | undefined>;
}

export class StaticTrustedIdentityProvider implements TrustedIdentityProvider {
  constructor(private readonly openId: string | undefined) {}

  getOpenId(): Promise<string | undefined> {
    return Promise.resolve(this.openId);
  }
}
