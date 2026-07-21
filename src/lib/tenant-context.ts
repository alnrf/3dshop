// lib/tenant-context.ts
import { AsyncLocalStorage } from "node:async_hooks";

// Carrega o storeId do request atual. Setado por runWithStore() no início do
// tratamento (server action, route handler, page) e lido pela extensão do Prisma.
// Requer Node runtime — não funciona no Edge (por isso o middleware só passa o slug).
type TenantStore = { storeId: string };

const als = new AsyncLocalStorage<TenantStore>();

export function runWithStore<T>(storeId: string, fn: () => Promise<T>): Promise<T> {
  return als.run({ storeId }, fn);
}

export function currentStoreId(): string | null {
  return als.getStore()?.storeId ?? null;
}
