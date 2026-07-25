import * as wxServerSdk from 'wx-server-sdk';

import type { TrustedWxContext } from './wx-cloud-types';

export function readTrustedWxContextFromWxServerSdk(): TrustedWxContext {
  const context = wxServerSdk.getWXContext();

  return {
    OPENID: context.OPENID,
    APPID: context.APPID,
  };
}
