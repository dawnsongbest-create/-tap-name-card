import type {
  AcceptPoliciesRepositoryInput,
  AcceptPoliciesResult,
  CreateIdentityInput,
  UserRepository,
} from './user-repository';
import { RepositoryConsistencyError, TransactionConflictError } from './user-repository';
import type { IdentityMapping, UserRecord, UserStatus } from './records';
import type {
  CloudBaseDatabase,
  CloudBaseDocumentResponse,
  CloudBaseTransaction,
} from '../platform/wx-cloud-types';

const USERS_COLLECTION = 'users';
const IDENTITY_MAPPINGS_COLLECTION = 'identity_mappings';
export const CLOUDBASE_TRANSACTION_CONFLICT_CODE = 'DATABASE_TRANSACTION_CONFLICT';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function extractDocument(response: CloudBaseDocumentResponse): Record<string, unknown> | undefined {
  const { data } = response;

  if (Array.isArray(data)) {
    const first = data[0];
    return isRecord(first) ? first : undefined;
  }

  return isRecord(data) ? data : undefined;
}

function readRequiredString(record: Record<string, unknown>, field: string): string {
  const value = record[field];

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RepositoryConsistencyError();
  }

  return value;
}

function readOptionalString(record: Record<string, unknown>, field: string): string | undefined {
  const value = record[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new RepositoryConsistencyError();
  }

  return value;
}

function readDate(
  record: Record<string, unknown>,
  field: string,
  required = true,
): Date | undefined {
  const value = record[field];

  if ((value === undefined || value === null) && !required) {
    return undefined;
  }

  if (value === undefined || value === null) {
    throw new RepositoryConsistencyError();
  }

  const date = value instanceof Date ? new Date(value) : new Date(value as string | number);

  if (Number.isNaN(date.getTime())) {
    throw new RepositoryConsistencyError();
  }

  return date;
}

function readUserStatus(record: Record<string, unknown>): UserStatus {
  const status = record.status;

  if (status !== 'ACTIVE' && status !== 'RESTRICTED' && status !== 'DELETED') {
    throw new RepositoryConsistencyError();
  }

  return status;
}

function deserializeUser(record: Record<string, unknown>, fallbackUserId: string): UserRecord {
  const userId =
    typeof record._id === 'string' && record._id.trim().length > 0 ? record._id : fallbackUserId;
  const currentCardId = readOptionalString(record, 'currentCardId');
  const acceptedTermsVersion = readOptionalString(record, 'acceptedTermsVersion');
  const acceptedPrivacyVersion = readOptionalString(record, 'acceptedPrivacyVersion');
  const termsAcceptedAt = readDate(record, 'termsAcceptedAt', false);
  const privacyAcceptedAt = readDate(record, 'privacyAcceptedAt', false);
  const deletedAt = readDate(record, 'deletedAt', false);

  return {
    _id: userId,
    openId: readRequiredString(record, 'openId'),
    status: readUserStatus(record),
    ...(currentCardId ? { currentCardId } : {}),
    ...(acceptedTermsVersion ? { acceptedTermsVersion } : {}),
    ...(acceptedPrivacyVersion ? { acceptedPrivacyVersion } : {}),
    ...(termsAcceptedAt ? { termsAcceptedAt } : {}),
    ...(privacyAcceptedAt ? { privacyAcceptedAt } : {}),
    createdAt: readDate(record, 'createdAt') as Date,
    updatedAt: readDate(record, 'updatedAt') as Date,
    ...(deletedAt ? { deletedAt } : {}),
  };
}

function deserializeMapping(record: Record<string, unknown>): IdentityMapping {
  const provider = record.provider;

  if (provider !== 'WECHAT_MINIPROGRAM') {
    throw new RepositoryConsistencyError();
  }

  return {
    userId: readRequiredString(record, 'userId'),
    provider,
    createdAt: readDate(record, 'createdAt') as Date,
  };
}

function serializeUser(user: UserRecord): Record<string, unknown> {
  return {
    openId: user.openId,
    status: user.status,
    ...(user.currentCardId ? { currentCardId: user.currentCardId } : {}),
    ...(user.acceptedTermsVersion ? { acceptedTermsVersion: user.acceptedTermsVersion } : {}),
    ...(user.acceptedPrivacyVersion ? { acceptedPrivacyVersion: user.acceptedPrivacyVersion } : {}),
    ...(user.termsAcceptedAt ? { termsAcceptedAt: user.termsAcceptedAt } : {}),
    ...(user.privacyAcceptedAt ? { privacyAcceptedAt: user.privacyAcceptedAt } : {}),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    ...(user.deletedAt ? { deletedAt: user.deletedAt } : {}),
  };
}

function serializeMapping(mapping: IdentityMapping): Record<string, unknown> {
  return {
    userId: mapping.userId,
    provider: mapping.provider,
    createdAt: mapping.createdAt,
  };
}

function readErrorCode(error: unknown): string | undefined {
  if (!isRecord(error)) {
    return undefined;
  }

  return typeof error.code === 'string' ? error.code : undefined;
}

export function isCloudBaseTransactionConflict(error: unknown): boolean {
  return readErrorCode(error) === CLOUDBASE_TRANSACTION_CONFLICT_CODE;
}

async function readUserById(
  source: CloudBaseDatabase | CloudBaseTransaction,
  userId: string,
): Promise<UserRecord | undefined> {
  const response = await source.collection(USERS_COLLECTION).doc(userId).get();
  const document = extractDocument(response);
  return document ? deserializeUser(document, userId) : undefined;
}

async function readMappingByIdentityKey(
  source: CloudBaseDatabase | CloudBaseTransaction,
  identityKey: string,
): Promise<IdentityMapping | undefined> {
  const response = await source.collection(IDENTITY_MAPPINGS_COLLECTION).doc(identityKey).get();
  const document = extractDocument(response);
  return document ? deserializeMapping(document) : undefined;
}

export class CloudBaseUserRepository implements UserRepository {
  constructor(private readonly database: CloudBaseDatabase) {}

  async findByIdentityKey(identityKey: string): Promise<UserRecord | undefined> {
    const mapping = await readMappingByIdentityKey(this.database, identityKey);

    if (!mapping) {
      return undefined;
    }

    const user = await readUserById(this.database, mapping.userId);

    if (!user) {
      throw new RepositoryConsistencyError();
    }

    return user;
  }

  async createIdentityAtomically(input: CreateIdentityInput): Promise<UserRecord> {
    try {
      return await this.database.runTransaction(async (transaction) => {
        const existingMapping = await readMappingByIdentityKey(transaction, input.identityKey);

        if (existingMapping) {
          const existingUser = await readUserById(transaction, existingMapping.userId);

          if (!existingUser) {
            throw new RepositoryConsistencyError();
          }

          return existingUser;
        }

        const collidingUser = await readUserById(transaction, input.user._id);

        if (collidingUser) {
          throw new TransactionConflictError();
        }

        await transaction
          .collection(USERS_COLLECTION)
          .doc(input.user._id)
          .set(serializeUser(input.user));
        await transaction
          .collection(IDENTITY_MAPPINGS_COLLECTION)
          .doc(input.identityKey)
          .set(serializeMapping(input.mapping));

        return input.user;
      }, 0);
    } catch (error) {
      if (
        error instanceof RepositoryConsistencyError ||
        error instanceof TransactionConflictError
      ) {
        throw error;
      }

      if (isCloudBaseTransactionConflict(error)) {
        throw new TransactionConflictError();
      }

      throw error;
    }
  }

  async acceptPoliciesAtomically(
    input: AcceptPoliciesRepositoryInput,
  ): Promise<AcceptPoliciesResult | undefined> {
    try {
      return await this.database.runTransaction(async (transaction) => {
        const mapping = await readMappingByIdentityKey(transaction, input.identityKey);

        if (!mapping) {
          return undefined;
        }

        const user = await readUserById(transaction, mapping.userId);

        if (!user) {
          throw new RepositoryConsistencyError();
        }

        if (
          user.acceptedTermsVersion === input.versions.terms &&
          user.acceptedPrivacyVersion === input.versions.privacy
        ) {
          return {
            user,
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

        await transaction
          .collection(USERS_COLLECTION)
          .doc(user._id)
          .update({
            acceptedTermsVersion: updatedUser.acceptedTermsVersion,
            acceptedPrivacyVersion: updatedUser.acceptedPrivacyVersion,
            termsAcceptedAt: updatedUser.termsAcceptedAt as Date,
            privacyAcceptedAt: updatedUser.privacyAcceptedAt as Date,
            updatedAt: updatedUser.updatedAt,
          });

        return {
          user: updatedUser,
          replayed: false,
        };
      }, 0);
    } catch (error) {
      if (error instanceof RepositoryConsistencyError) {
        throw error;
      }

      if (isCloudBaseTransactionConflict(error)) {
        throw new TransactionConflictError();
      }

      throw error;
    }
  }
}
