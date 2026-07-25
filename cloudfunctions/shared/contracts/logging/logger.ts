import type { LogContext, LogEntry, LogLevel, LogSink } from '../types/logging';
import { redactLogContext } from './redact';

const LOG_LEVEL_PRIORITY: Readonly<Record<LogLevel, number>> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
}

export interface LoggerOptions {
  minimumLevel: LogLevel;
  sink: LogSink;
}

export function createLogger(options: LoggerOptions): Logger {
  const write = (level: LogLevel, message: string, context?: LogContext): void => {
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[options.minimumLevel]) {
      return;
    }

    const entry: LogEntry = {
      level,
      message,
      ...(context ? { context: redactLogContext(context) } : {}),
    };

    options.sink(entry);
  };

  return {
    debug: (message, context) => write('debug', message, context),
    info: (message, context) => write('info', message, context),
    warn: (message, context) => write('warn', message, context),
    error: (message, context) => write('error', message, context),
  };
}
