import * as cloudbase from '@cloudbase/node-sdk';
import * as wxServerSdk from 'wx-server-sdk';

import { createAuthCloudFunctionMain } from '../shared/platform/cloud-function-main';
import { readTrustedWxContextFromWxServerSdk } from '../shared/platform/wx-server-context';
import type { CloudBaseDatabase } from '../shared/platform/wx-cloud-types';

wxServerSdk.init({ env: wxServerSdk.DYNAMIC_CURRENT_ENV as unknown as string });
const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });

export const main = createAuthCloudFunctionMain('accountAcceptPolicies', {
  database: app.database() as unknown as CloudBaseDatabase,
  readTrustedWxContext: readTrustedWxContextFromWxServerSdk,
  environment: process.env,
});
