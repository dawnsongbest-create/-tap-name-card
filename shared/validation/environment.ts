import { APP_ENVIRONMENTS } from '../constants/environment';
import type { AppEnvironment } from '../types/environment';

export function isAppEnvironment(value: string): value is AppEnvironment {
  return APP_ENVIRONMENTS.some((environment) => environment === value);
}

export function parseAppEnvironment(value: string): AppEnvironment {
  if (!isAppEnvironment(value)) {
    throw new Error(`Unsupported application environment: ${value}`);
  }

  return value;
}
