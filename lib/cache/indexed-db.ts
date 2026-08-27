"use client";

const DATABASE = "task-manager-cache";
const STORE = "snapshots";

export type CacheEnvelope<T> = { value: T; syncedAt: string; fullSyncAt: string };

function database(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  if (typeof indexedDB === "undefined") return null;
  const db = await database();
  return new Promise<CacheEnvelope<T> | null>((resolve, reject) => {
    const request = db.transaction(STORE).objectStore(STORE).get(key);
    request.onsuccess = () => resolve((request.result as CacheEnvelope<T>) ?? null);
    request.onerror = () => reject(request.error);
  }).finally(() => db.close());
}

export async function writeCache<T>(key: string, value: CacheEnvelope<T>) {
  const db = await database();
  return new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE, "readwrite");
    transaction.objectStore(STORE).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  }).finally(() => db.close());
}
