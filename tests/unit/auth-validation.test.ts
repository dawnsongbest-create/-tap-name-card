import { describe, expect, it } from 'vitest';

import { parseAccountAcceptPoliciesInput, parseEmptyAuthInput } from '../../shared/validation/auth';

describe('auth input validation', () => {
  it('accepts only an empty object for trusted-identity endpoints', () => {
    expect(parseEmptyAuthInput({})).toEqual({});
    expect(() => parseEmptyAuthInput({ openId: 'forged' })).toThrow();
    expect(() => parseEmptyAuthInput({ userId: 'forged' })).toThrow();
    expect(() => parseEmptyAuthInput(null)).toThrow();
  });

  it('requires both policy versions and trims them', () => {
    expect(
      parseAccountAcceptPoliciesInput({
        acceptedTermsVersion: ' terms-v1 ',
        acceptedPrivacyVersion: ' privacy-v1 ',
      }),
    ).toEqual({
      acceptedTermsVersion: 'terms-v1',
      acceptedPrivacyVersion: 'privacy-v1',
    });
  });

  it('rejects partial, blank, or extended policy inputs', () => {
    expect(() => parseAccountAcceptPoliciesInput({ acceptedTermsVersion: 'terms-v1' })).toThrow();
    expect(() =>
      parseAccountAcceptPoliciesInput({
        acceptedTermsVersion: ' ',
        acceptedPrivacyVersion: 'privacy-v1',
      }),
    ).toThrow();
    expect(() =>
      parseAccountAcceptPoliciesInput({
        acceptedTermsVersion: 'terms-v1',
        acceptedPrivacyVersion: 'privacy-v1',
        operationId: 'not-supported',
      }),
    ).toThrow();
  });
});
