import { randomUUID } from 'node:crypto';

import { AuthService } from '../auth/auth-service';
import {
  createAccountAcceptPoliciesHandler,
  createAccountGetMeHandler,
  createAuthEnsureUserHandler,
} from '../auth/handlers';
import { CloudBaseUserRepository } from '../db/cloudbase-user-repository';
import { createFailureResult } from '../contracts/cloud-function-result';
import type { CloudFunctionResult } from '../contracts/types/cloud-function';
import { createRequestId } from '../contracts/types/request-id';
import { loadCloudFunctionServerConfig } from './server-config';
import type { CloudBaseDatabase, TrustedWxContext, TrustedWxContextReader } from './wx-cloud-types';
import { WxTrustedIdentityProvider } from './wx-trusted-identity-provider';

export type AuthCloudFunctionName = 'authEnsureUser' | 'accountGetMe' | 'accountAcceptPolicies';

export interface CloudFunctionRuntimeDependencies {
  database: CloudBaseDatabase;
  readTrustedWxContext: () => TrustedWxContext;
  environment: NodeJS.ProcessEnv;
  createUserId?: () => string;
}

const SAFE_REQUEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readRequest(event: unknown): { input: unknown; requestId: string } {
  if (!isRecord(event)) {
    return {
      input: event,
      requestId: createRequestId('cloud'),
    };
  }

  const requestId =
    typeof event.requestId === 'string' && SAFE_REQUEST_ID_PATTERN.test(event.requestId)
      ? event.requestId
      : createRequestId('cloud');

  return {
    input: 'input' in event ? event.input : {},
    requestId,
  };
}

async function executeOperation(
  functionName: AuthCloudFunctionName,
  service: AuthService,
  input: unknown,
  requestId: string,
): Promise<CloudFunctionResult<unknown>> {
  if (functionName === 'authEnsureUser') {
    return createAuthEnsureUserHandler(service)(input, requestId);
  }

  if (functionName === 'accountGetMe') {
    return createAccountGetMeHandler(service)(input, requestId);
  }

  return createAccountAcceptPoliciesHandler(service)(input, requestId);
}

export function createAuthCloudFunctionMain(
  functionName: AuthCloudFunctionName,
  dependencies: CloudFunctionRuntimeDependencies,
): (event: unknown, context?: unknown) => Promise<CloudFunctionResult<unknown>> {
  return async (event: unknown, context?: unknown) => {
    void context;
    const request = readRequest(event);

    try {
      const config = loadCloudFunctionServerConfig(dependencies.environment);
      const service = new AuthService({
        identityProvider: new WxTrustedIdentityProvider(
          dependencies.readTrustedWxContext as TrustedWxContextReader,
          config.expectedMiniProgramAppId,
        ),
        repository: new CloudBaseUserRepository(dependencies.database),
        identityHmacSecret: config.identityHmacSecret,
        currentPolicyVersions: config.currentPolicyVersions,
        createUserId: dependencies.createUserId ?? randomUUID,
      });

      return await executeOperation(functionName, service, request.input, request.requestId);
    } catch {
      return createFailureResult('SERVICE_UNAVAILABLE', request.requestId);
    }
  };
}
