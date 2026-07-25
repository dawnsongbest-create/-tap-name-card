import {
  RepositoryConsistencyError,
  TransactionConflictError,
  type AcceptPoliciesRepositoryInput,
  type AcceptPoliciesResult,
  type CreateIdentityInput,
  type UserRepository,
} from './user-repository';
import type { IdentityMapping, UserRecord, UserStatus } from './records';

function cloneUser(user: UserRecord): UserRecord {
  return {
    ...user,
    createdAt: new Date(user.createdAt),
    updatedAt: new Date(user.updatedAt),
    ...(user.termsAcceptedAt ? { termsAcceptedAt: new Date(user.termsAcceptedAt) } : {}),
    ...(user.privacyAcceptedAt ? { privacyAcceptedAt: new Date(user.privacyAcceptedAt) } : {}),
    ...(user.deletedAt ? { deletedAt: new Date(user.deletedAt) } : {}),
  };
}

export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, UserRecord>();
  private readonly mappings = new Map<string, IdentityMapping>();
  private transactionQueue: Promise<void> = Promise.resolve();
  private remainingForcedConflicts = 0;

  async findByIdentityKey(identityKey: string): Promise<UserRecord | undefined> {
    const mapping = this.mappings.get(identityKey);

    if (!mapping) {
      return undefined;
    }

    const user = this.users.get(mapping.userId);

    if (!user) {
      throw new RepositoryConsistencyError();
    }

    return cloneUser(user);
  }

  createIdentityAtomically(input: CreateIdentityInput): Promise<UserRecord> {
    return this.withTransaction(() => {
      if (this.remainingForcedConflicts > 0) {
        this.remainingForcedConflicts -= 1;
        throw new TransactionConflictError();
      }

      if (this.mappings.has(input.identityKey) || this.users.has(input.user._id)) {
        throw new TransactionConflictError();
      }

      this.users.set(input.user._id, cloneUser(input.user));
      this.mappings.set(input.identityKey, { ...input.mapping });

      return cloneUser(input.user);
    });
  }

  acceptPoliciesAtomically(
    input: AcceptPoliciesRepositoryInput,
  ): Promise<AcceptPoliciesResult | undefined> {
    return this.withTransaction(() => {
      const mapping = this.mappings.get(input.identityKey);

      if (!mapping) {
        return undefined;
      }

      const user = this.users.get(mapping.userId);

      if (!user) {
        throw new RepositoryConsistencyError();
      }

      if (
        user.acceptedTermsVersion === input.versions.terms &&
        user.acceptedPrivacyVersion === input.versions.privacy
      ) {
        return {
          user: cloneUser(user),
          replayed: true,
        };
      }

      const updatedUser: UserRecord = {
        ...user,
        acceptedTermsVersion: input.versions.terms,
        acceptedPrivacyVersion: input.versions.privacy,
        termsAcceptedAt: new Date(input.acceptedAt),
        privacyAcceptedAt: new Date(input.acceptedAt),
        updatedAt: new Date(input.acceptedAt),
      };

      this.users.set(user._id, updatedUser);

      return {
        user: cloneUser(updatedUser),
        replayed: false,
      };
    });
  }

  forceTransactionConflicts(count: number): void {
    this.remainingForcedConflicts = count;
  }

  async setStatus(identityKey: string, status: UserStatus, changedAt = new Date()): Promise<void> {
    await this.withTransaction(() => {
      const mapping = this.mappings.get(identityKey);

      if (!mapping) {
        throw new Error('Cannot set status for an unknown identity.');
      }

      const user = this.users.get(mapping.userId);

      if (!user) {
        throw new RepositoryConsistencyError();
      }

      this.users.set(user._id, {
        ...user,
        status,
        updatedAt: new Date(changedAt),
        ...(status === 'DELETED' ? { deletedAt: new Date(changedAt) } : {}),
      });
    });
  }

  async deleteMappedUserForTest(identityKey: string): Promise<void> {
    await this.withTransaction(() => {
      const mapping = this.mappings.get(identityKey);

      if (mapping) {
        this.users.delete(mapping.userId);
      }
    });
  }

  getCounts(): { users: number; mappings: number } {
    return {
      users: this.users.size,
      mappings: this.mappings.size,
    };
  }

  getMappingSnapshotForTest(identityKey: string): IdentityMapping | undefined {
    const mapping = this.mappings.get(identityKey);
    return mapping ? { ...mapping } : undefined;
  }

  async getPolicySnapshot(
    identityKey: string,
  ): Promise<
    | Pick<
        UserRecord,
        'acceptedTermsVersion' | 'acceptedPrivacyVersion' | 'termsAcceptedAt' | 'privacyAcceptedAt'
      >
    | undefined
  > {
    const user = await this.findByIdentityKey(identityKey);

    if (!user) {
      return undefined;
    }

    return {
      acceptedTermsVersion: user.acceptedTermsVersion,
      acceptedPrivacyVersion: user.acceptedPrivacyVersion,
      termsAcceptedAt: user.termsAcceptedAt,
      privacyAcceptedAt: user.privacyAcceptedAt,
    };
  }

  private async withTransaction<T>(work: () => T | Promise<T>): Promise<T> {
    const previousTransaction = this.transactionQueue;
    let releaseTransaction = (): void => undefined;

    this.transactionQueue = new Promise<void>((resolveTransaction) => {
      releaseTransaction = resolveTransaction;
    });

    await previousTransaction;

    try {
      return await work();
    } finally {
      releaseTransaction();
    }
  }
}
