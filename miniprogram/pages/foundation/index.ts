import { getEnvironmentConfig, getEnvironmentSummary } from '../../config/env';
import { createAuthApi } from '../../services/auth';
import { createCloudFunctionCallerForEnvironment, getWxCloudApi } from '../../services/cloud';
import { createRequestIdProvider } from '../../shared/types/request-id';
import { mapAuthResultToState } from '../../state/auth';

const environment = getEnvironmentSummary();
const environmentConfig = getEnvironmentConfig();
const authApi = createAuthApi(
  createCloudFunctionCallerForEnvironment(environmentConfig, getWxCloudApi()),
  createRequestIdProvider('m1_2_development'),
);

Page({
  data: {
    environmentName: environment.environment,
    cloudStatus: environment.cloudConfigured ? 'development 已配置，等待云端验收' : '未配置',
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
