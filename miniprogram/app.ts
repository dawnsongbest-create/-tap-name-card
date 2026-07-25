import { getEnvironmentSummary } from './config/env';
import { logger } from './utils/logger';

App({
  onLaunch() {
    const environment = getEnvironmentSummary();

    logger.info('M1.1 foundation application launched.', environment);
  },
});
