export interface TrustedWxContext {
  OPENID?: unknown;
  APPID?: unknown;
}

export type TrustedWxContextReader = () => TrustedWxContext;

export interface CloudBaseDocumentResponse {
  data?: unknown;
}

export interface CloudBaseDocumentReference {
  get(): Promise<CloudBaseDocumentResponse>;
  set(data: Record<string, unknown>): Promise<unknown>;
  update(data: Record<string, unknown>): Promise<unknown>;
}

export interface CloudBaseCollectionReference {
  doc(documentId: string): CloudBaseDocumentReference;
}

export interface CloudBaseTransaction {
  collection(collectionName: string): CloudBaseCollectionReference;
}

export interface CloudBaseDatabase {
  collection(collectionName: string): CloudBaseCollectionReference;
  runTransaction<T>(
    work: (transaction: CloudBaseTransaction) => Promise<T>,
    retryTimes?: number,
  ): Promise<T>;
}
