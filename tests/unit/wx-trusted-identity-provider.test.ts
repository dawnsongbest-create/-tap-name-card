import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  TrustedMiniProgramAppIdMismatchError,
  WxTrustedIdentityProvider,
} from '../../cloudfunctions/shared/platform/wx-trusted-identity-provider';
import { readTrustedWxContextFromWxServerSdk } from '../../cloudfunctions/shared/platform/wx-server-context';

describe.sequential('trusted WeChat identity adapter', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reads the SDK-injected identity through wx-server-sdk getWXContext', () => {
    vi.stubEnv('WX_CONTEXT_KEYS', 'WX_OPENID,WX_APPID');
    vi.stubEnv('WX_OPENID', 'synthetic-sdk-open-id');
    vi.stubEnv('WX_APPID', 'expected-app-id');

    expect(readTrustedWxContextFromWxServerSdk()).toEqual({
      OPENID: 'synthetic-sdk-open-id',
      APPID: 'expected-app-id',
    });
  });

  it('reads fresh SDK context for every invocation instead of caching identity', () => {
    vi.stubEnv('WX_CONTEXT_KEYS', 'WX_OPENID,WX_APPID');
    vi.stubEnv('WX_OPENID', 'synthetic-sdk-open-id-a');
    vi.stubEnv('WX_APPID', 'expected-app-id');

    expect(readTrustedWxContextFromWxServerSdk().OPENID).toBe('synthetic-sdk-open-id-a');

    vi.stubEnv('WX_OPENID', 'synthetic-sdk-open-id-b');

    expect(readTrustedWxContextFromWxServerSdk().OPENID).toBe('synthetic-sdk-open-id-b');
  });

  it('reads the trusted context for every invocation without caching identity', async () => {
    const contexts = [
      { OPENID: 'synthetic-open-id-a', APPID: 'expected-app-id' },
      { OPENID: 'synthetic-open-id-b', APPID: 'expected-app-id' },
    ];
    let reads = 0;
    const provider = new WxTrustedIdentityProvider(
      () => contexts[reads++] ?? {},
      'expected-app-id',
    );

    expect(await provider.getOpenId()).toBe('synthetic-open-id-a');
    expect(await provider.getOpenId()).toBe('synthetic-open-id-b');
    expect(reads).toBe(2);
  });

  it('returns no identity when trusted OpenID is missing', async () => {
    const provider = new WxTrustedIdentityProvider(
      () => ({ APPID: 'expected-app-id' }),
      'expected-app-id',
    );

    await expect(provider.getOpenId()).resolves.toBeUndefined();
  });

  it('rejects an APPID mismatch without exposing either identifier', async () => {
    const provider = new WxTrustedIdentityProvider(
      () => ({
        OPENID: 'synthetic-open-id',
        APPID: 'wrong-app-id',
      }),
      'expected-app-id',
    );

    await expect(provider.getOpenId()).rejects.toBeInstanceOf(TrustedMiniProgramAppIdMismatchError);

    try {
      await provider.getOpenId();
    } catch (error) {
      expect(String(error)).not.toContain('synthetic-open-id');
      expect(String(error)).not.toContain('wrong-app-id');
    }
  });
});
