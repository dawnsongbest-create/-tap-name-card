import { getEnvironmentSummary } from '../../config/env';
import { createAuthApi } from '../../services/auth';
import { createUnconfiguredCloudFunctionCaller } from '../../services/cloud';
import { createRequestIdProvider } from '../../shared/types/request-id';
import { mapAuthResultToState } from '../../state/auth';

const environment = getEnvironmentSummary();
const authApi = createAuthApi(
  createUnconfiguredCloudFunctionCaller(),
  createRequestIdProvider('m1_2_local'),
);

Page({
  data: {
    environmentName: environment.environment,
    cloudStatus: environment.cloudConfigured ? '已配置' : '未配置（M1.2-A 预期状态）',
    retryCount: 0,
    authState: 'ANONYMOUS',
    authRequestId: '尚未手动调用',
  },
  onRetry() {
    this.setData({
      retryCount: this.data.retryCount + 1,
    });
  },
  async onEnsureUser() {
    this.setData({ authState: 'LOADING' });
    const result = await authApi.ensureUser();
    const state = mapAuthResultToState(result);

    this.setData({
      authState: state.kind,
      authRequestId: result.requestId,
    });
  },
  async onGetMe() {
    this.setData({ authState: 'LOADING' });
    const result = await authApi.getMe();
    const state = mapAuthResultToState(result);

    this.setData({
      authState: state.kind,
      authRequestId: result.requestId,
    });
  },
});
