import { createLogger } from '../shared/logging/logger';
import type { LogEntry } from '../shared/types/logging';
import { CURRENT_ENVIRONMENT } from '../config/env';

function consoleSink(entry: LogEntry): void {
  const output = entry.context ? [entry.message, entry.context] : [entry.message];

  if (entry.level === 'error') {
    console.error(...output);
    return;
  }

  if (entry.level === 'warn') {
    console.warn(...output);
    return;
  }

  if (entry.level === 'debug') {
    console.debug(...output);
    return;
  }

  console.info(...output);
}

export const logger = createLogger({
  minimumLevel: CURRENT_ENVIRONMENT === 'production' ? 'info' : 'debug',
  sink: consoleSink,
});
