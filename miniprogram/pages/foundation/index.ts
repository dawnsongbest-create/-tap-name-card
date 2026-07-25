import { getEnvironmentSummary } from '../../config/env';

const environment = getEnvironmentSummary();

Page({
  data: {
    environmentName: environment.environment,
    cloudStatus: environment.cloudConfigured ? '已配置' : '未配置（M1.1 预期状态）',
    retryCount: 0,
  },
  onRetry() {
    this.setData({
      retryCount: this.data.retryCount + 1,
    });
  },
});
