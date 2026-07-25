import type {
  CloudBaseCollectionReference,
  CloudBaseDatabase,
  CloudBaseDocumentReference,
  CloudBaseTransaction,
} from '../../cloudfunctions/shared/platform/wx-cloud-types';

type StoredDocument = Record<string, unknown>;
type CollectionStore = Map<string, StoredDocument>;
type DatabaseStore = Map<string, CollectionStore>;
type DocumentOperation = 'get' | 'set' | 'update';
type BeforeDocumentOperation = (
  operation: DocumentOperation,
  collectionName: string,
  documentId: string,
) => void;

interface QueuedDocumentError {
  operation: DocumentOperation;
  collectionName: string;
  documentId: string;
  error: unknown;
}

function cloneDocument(document: StoredDocument): StoredDocument {
  return structuredClone(document);
}

function cloneStore(store: DatabaseStore): DatabaseStore {
  return new Map(
    [...store].map(([collectionName, collection]) => [
      collectionName,
      new Map(
        [...collection].map(([documentId, document]) => [documentId, cloneDocument(document)]),
      ),
    ]),
  );
}

class FakeDocumentReference implements CloudBaseDocumentReference {
  constructor(
    private readonly store: DatabaseStore,
    private readonly collectionName: string,
    private readonly documentId: string,
    private readonly beforeOperation: BeforeDocumentOperation,
  ) {}

  get(): Promise<{ data?: unknown }> {
    this.beforeOperation('get', this.collectionName, this.documentId);
    const document = this.store.get(this.collectionName)?.get(this.documentId);

    return Promise.resolve({
      data: document
        ? {
            _id: this.documentId,
            ...cloneDocument(document),
          }
        : undefined,
    });
  }

  set(data: Record<string, unknown>): Promise<unknown> {
    this.beforeOperation('set', this.collectionName, this.documentId);
    const collection = this.getOrCreateCollection();
    collection.set(this.documentId, cloneDocument(data));
    return Promise.resolve({ updated: 1 });
  }

  update(data: Record<string, unknown>): Promise<unknown> {
    this.beforeOperation('update', this.collectionName, this.documentId);
    const collection = this.getOrCreateCollection();
    const existing = collection.get(this.documentId);

    if (!existing) {
      return Promise.reject(new Error('Cannot update a missing fake document.'));
    }

    collection.set(this.documentId, {
      ...existing,
      ...cloneDocument(data),
    });
    return Promise.resolve({ updated: 1 });
  }

  private getOrCreateCollection(): CollectionStore {
    const existing = this.store.get(this.collectionName);

    if (existing) {
      return existing;
    }

    const collection = new Map<string, StoredDocument>();
    this.store.set(this.collectionName, collection);
    return collection;
  }
}

class FakeCollectionReference implements CloudBaseCollectionReference {
  constructor(
    private readonly store: DatabaseStore,
    private readonly collectionName: string,
    private readonly beforeOperation: BeforeDocumentOperation,
  ) {}

  doc(documentId: string): CloudBaseDocumentReference {
    return new FakeDocumentReference(
      this.store,
      this.collectionName,
      documentId,
      this.beforeOperation,
    );
  }
}

class FakeTransaction implements CloudBaseTransaction {
  constructor(
    private readonly store: DatabaseStore,
    private readonly beforeOperation: BeforeDocumentOperation,
  ) {}

  collection(collectionName: string): CloudBaseCollectionReference {
    return new FakeCollectionReference(this.store, collectionName, this.beforeOperation);
  }
}

export class FakeCloudBaseDatabase implements CloudBaseDatabase {
  private store: DatabaseStore = new Map();
  private transactionErrors: unknown[] = [];
  private documentErrors: QueuedDocumentError[] = [];
  transactionCalls = 0;
  transactionRetryArguments: Array<number | undefined> = [];

  collection(collectionName: string): CloudBaseCollectionReference {
    return new FakeCollectionReference(
      this.store,
      collectionName,
      this.throwQueuedDocumentError.bind(this),
    );
  }

  async runTransaction<T>(
    work: (transaction: CloudBaseTransaction) => Promise<T>,
    retryTimes?: number,
  ): Promise<T> {
    this.transactionCalls += 1;
    this.transactionRetryArguments.push(retryTimes);

    const queuedError = this.transactionErrors.shift();

    if (queuedError !== undefined) {
      throw queuedError;
    }

    const transactionStore = cloneStore(this.store);
    const result = await work(
      new FakeTransaction(transactionStore, this.throwQueuedDocumentError.bind(this)),
    );
    this.store = transactionStore;
    return result;
  }

  queueTransactionErrors(...errors: unknown[]): void {
    this.transactionErrors.push(...errors);
  }

  queueDocumentError(
    operation: DocumentOperation,
    collectionName: string,
    documentId: string,
    error: unknown,
  ): void {
    this.documentErrors.push({
      operation,
      collectionName,
      documentId,
      error,
    });
  }

  seed(collectionName: string, documentId: string, document: StoredDocument): void {
    const collection = this.store.get(collectionName) ?? new Map<string, StoredDocument>();
    collection.set(documentId, cloneDocument(document));
    this.store.set(collectionName, collection);
  }

  getDocument(collectionName: string, documentId: string): StoredDocument | undefined {
    const document = this.store.get(collectionName)?.get(documentId);
    return document ? cloneDocument(document) : undefined;
  }

  getCollectionSize(collectionName: string): number {
    return this.store.get(collectionName)?.size ?? 0;
  }

  private throwQueuedDocumentError(
    operation: DocumentOperation,
    collectionName: string,
    documentId: string,
  ): void {
    const errorIndex = this.documentErrors.findIndex(
      (entry) =>
        entry.operation === operation &&
        entry.collectionName === collectionName &&
        entry.documentId === documentId,
    );

    if (errorIndex < 0) {
      return;
    }

    const [entry] = this.documentErrors.splice(errorIndex, 1);
    throw entry?.error;
  }
}
