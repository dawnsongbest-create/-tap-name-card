import { createHmac } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { deriveIdentityKey } from '../../cloudfunctions/shared/auth/identity-key';

describe('deriveIdentityKey', () => {
  it('uses the versioned WeChat OpenID namespace with HMAC-SHA256', () => {
    const openId = 'synthetic-open-id';
    const secret = 'local-test-secret';
    const expected = createHmac('sha256', secret)
      .update(`wechat-openid:v1:${openId}`)
      .digest('hex');

    expect(deriveIdentityKey(openId, secret)).toBe(expected);
    expect(deriveIdentityKey(openId, secret)).toHaveLength(64);
  });

  it('isolates identity keys when the environment secret changes', () => {
    expect(deriveIdentityKey('same-open-id', 'local-secret')).not.toBe(
      deriveIdentityKey('same-open-id', 'development-secret'),
    );
  });

  it.each([
    ['', 'secret', 'AUTH_REQUIRED'],
    ['open-id', '', 'SERVICE_UNAVAILABLE'],
  ] as const)('rejects missing trusted material', (openId, secret, code) => {
    expect(() => deriveIdentityKey(openId, secret)).toThrowError(expect.objectContaining({ code }));
  });
});
