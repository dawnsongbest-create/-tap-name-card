import type {
  AccountAcceptPoliciesInput,
  AccountAcceptPoliciesOutput,
  AuthEnsureUserOutput,
  PolicyVersions,
} from '../contracts/types/auth';
import type { CurrentUserView } from '../contracts/types/user';
import { validatePolicyVersions } from '../contracts/validation/policies';
import type { IdentityMapping, UserRecord } from '../db/records';
import {
  RepositoryConsistencyError,
  TransactionConflictError,
  type UserRepository,
} from '../db/user-repository';
import { AuthServiceError } from './auth-service-error';
import { deriveIdentityKey } from './identity-key';
import type { TrustedIdentityProvider } from './trusted-identity-provider';
import { toCurrentUserView } from './user-view';

const DEFAULT_MAX_TRANSACTION_ATTEMPTS = 3;
const IDENTITY_PROVIDER = 'WECHAT_MINIPROGRAM';

export interface AuthServiceDependencies {
  identityProvider: TrustedIdentityProvider;
  repository: UserRepository;
  identityHmacSecret: string;
  currentPolicyVersions: PolicyVersions;
  createUserId: () => string;
  now?: () => Date;
  delay?: (milliseconds: number) => Promise<void>;
  maxTransactionAttempts?: number;
}

interface TrustedIdentity {
  openId: string;
  identityKey: string;
}

function defaultDelay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

function retryDelayMilliseconds(attempt: number): number {
  return 10 * 2 ** attempt;
}

export class AuthService {
  private readonly now: () => Date;
  private readonly delay: (milliseconds: number) => Promise<void>;
  private readonly maxTransactionAttempts: number;

  constructor(private readonly dependencies: AuthServiceDependencies) {
    this.now = dependencies.now ?? (() => new Date());
    this.delay = dependencies.delay ?? defaultDelay;
    this.maxTransactionAttempts =
      dependencies.maxTransactionAttempts ?? DEFAULT_MAX_TRANSACTION_ATTEMPTS;

    if (
      !Number.isInteger(this.maxTransactionAttempts) ||
      this.maxTransactionAttempts < 1 ||
      this.maxTransactionAttempts > DEFAULT_MAX_TRANSACTION_ATTEMPTS
    ) {
      throw new Error('Transaction attempts must be an integer from 1 to 3.');
    }
  }

  async ensureUser(): Promise<AuthEnsureUserOutput> {
    const identity = await this.getTrustedIdentity();
    const existingUser = await this.findUser(identity.identityKey);

    if (existingUser) {
      return toCurrentUserView(existingUser, this.getCurrentPolicyVersions());
    }

    for (let attempt = 0; attempt < this.maxTransactionAttempts; attempt += 1) {
      const createdAt = this.now();
      const userId = this.dependencies.createUserId();
      const user: UserRecord = {
        _id: userId,
        openId: identity.openId,
        status: 'ACTIVE',
        createdAt,
        updatedAt: createdAt,
      };
      const mapping: IdentityMapping = {
        userId,
        provider: IDENTITY_PROVIDER,
        createdAt,
      };

      try {
        const createdUser = await this.dependencies.repository.createIdentityAtomically({
          identityKey: identity.identityKey,
          user,
          mapping,
        });

        return toCurrentUserView(createdUser, this.getCurrentPolicyVersions());
      } catch (error) {
        if (!(error instanceof TransactionConflictError)) {
          this.throwRepositoryError(error);
        }

        const concurrentWinner = await this.findUser(identity.identityKey);

        if (concurrentWinner) {
          return toCurrentUserView(concurrentWinner, this.getCurrentPolicyVersions());
        }

        if (attempt + 1 >= this.maxTransactionAttempts) {
          throw new AuthServiceError('SERVICE_UNAVAILABLE');
        }

        await this.delay(retryDelayMilliseconds(attempt));
      }
    }

    throw new AuthServiceError('SERVICE_UNAVAILABLE');
  }

  async getMe(): Promise<CurrentUserView> {
    const identity = await this.getTrustedIdentity();
    const user = await this.findUser(identity.identityKey);

    if (!user) {
      throw new AuthServiceError('USER_NOT_FOUND');
    }

    return toCurrentUserView(user, this.getCurrentPolicyVersions());
  }

  async acceptPolicies(input: AccountAcceptPoliciesInput): Promise<AccountAcceptPoliciesOutput> {
    const currentVersions = this.getCurrentPolicyVersions();
    const identity = await this.getTrustedIdentity();
    const existingUser = await this.findUser(identity.identityKey);

    if (!existingUser) {
      throw new AuthServiceError('USER_NOT_FOUND');
    }

    toCurrentUserView(existingUser, currentVersions);

    if (
      input.acceptedTermsVersion !== currentVersions.terms ||
      input.acceptedPrivacyVersion !== currentVersions.privacy
    ) {
      throw new AuthServiceError('POLICY_VERSION_UNSUPPORTED');
    }

    const acceptedAt = this.now();

    for (let attempt = 0; attempt < this.maxTransactionAttempts; attempt += 1) {
      try {
        const result = await this.dependencies.repository.acceptPoliciesAtomically({
          identityKey: identity.identityKey,
          versions: currentVersions,
          acceptedAt,
        });

        if (!result) {
          throw new AuthServiceError('USER_NOT_FOUND');
        }

        return {
          user: toCurrentUserView(result.user, currentVersions),
          replayed: result.replayed,
        };
      } catch (error) {
        if (error instanceof AuthServiceError) {
          throw error;
        }

        if (!(error instanceof TransactionConflictError)) {
          this.throwRepositoryError(error);
        }

        if (attempt + 1 >= this.maxTransactionAttempts) {
          throw new AuthServiceError('SERVICE_UNAVAILABLE');
        }

        await this.delay(retryDelayMilliseconds(attempt));
      }
    }

    throw new AuthServiceError('SERVICE_UNAVAILABLE');
  }

  private getCurrentPolicyVersions(): PolicyVersions {
    try {
      validatePolicyVersions(this.dependencies.currentPolicyVersions);
      return this.dependencies.currentPolicyVersions;
    } catch {
      throw new AuthServiceError('SERVICE_UNAVAILABLE');
    }
  }

  private async getTrustedIdentity(): Promise<TrustedIdentity> {
    let openId: string | undefined;

    try {
      openId = await this.dependencies.identityProvider.getOpenId();
    } catch {
      throw new AuthServiceError('SERVICE_UNAVAILABLE');
    }

    if (!openId?.trim()) {
      throw new AuthServiceError('AUTH_REQUIRED');
    }

    return {
      openId,
      identityKey: deriveIdentityKey(openId, this.dependencies.identityHmacSecret),
    };
  }

  private async findUser(identityKey: string): Promise<UserRecord | undefined> {
    try {
      return await this.dependencies.repository.findByIdentityKey(identityKey);
    } catch (error) {
      this.throwRepositoryError(error);
    }
  }

  private throwRepositoryError(error: unknown): never {
    if (error instanceof AuthServiceError) {
      throw error;
    }

    if (error instanceof RepositoryConsistencyError || error instanceof TransactionConflictError) {
      throw new AuthServiceError('SERVICE_UNAVAILABLE');
    }

    throw new AuthServiceError('SERVICE_UNAVAILABLE');
  }
}
