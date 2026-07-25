import { getEnvironmentConfig, getEnvironmentSummary } from './config/env';
import { getWxCloudApi, initializeCloudForEnvironment } from './services/cloud';
import { logger } from './utils/logger';

App({
  onLaunch() {
    const config = getEnvironmentConfig();
    const environment = getEnvironmentSummary();
    const cloudInitialized = initializeCloudForEnvironment(config, getWxCloudApi());

    logger.info('Foundation application launched.', {
      ...environment,
      cloudInitialized,
      authState: 'ANONYMOUS',
    });
  },
});
