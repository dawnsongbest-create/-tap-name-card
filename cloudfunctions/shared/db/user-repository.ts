import type { PolicyVersions } from '../contracts/types/auth';
import type { IdentityMapping, UserRecord } from './records';

export class TransactionConflictError extends Error {
  constructor() {
    super('Identity transaction conflict.');
    this.name = 'TransactionConflictError';
  }
}

export class RepositoryConsistencyError extends Error {
  constructor() {
    super('Identity mapping points to a missing user.');
    this.name = 'RepositoryConsistencyError';
  }
}

export interface CreateIdentityInput {
  identityKey: string;
  mapping: IdentityMapping;
  user: UserRecord;
}

export interface AcceptPoliciesResult {
  user: UserRecord;
  replayed: boolean;
}

export interface AcceptPoliciesRepositoryInput {
  identityKey: string;
  versions: PolicyVersions;
  acceptedAt: Date;
}

export interface UserRepository {
  findByIdentityKey(identityKey: string): Promise<UserRecord | undefined>;
  createIdentityAtomically(input: CreateIdentityInput): Promise<UserRecord>;
  acceptPoliciesAtomically(
    input: AcceptPoliciesRepositoryInput,
  ): Promise<AcceptPoliciesResult | undefined>;
}
