// lib/tenant-context.ts
import { AsyncLocalStorage } from "node:async_hooks";

// Carrega o storeId do request atual. Setado por runWithStore() no início do
// tratamento (server action, route handler, page) e lido pela extensão do Prisma.
// Requer Node runtime — não funciona no Edge (por isso o middleware só passa o slug).
type TenantStore = { storeId: string };

// Mesmo motivo do cache em lib/prisma.ts: em dev, o Next compila server
// actions/páginas/route handlers em bundles separados, e sem isso cada um
// podia acabar com sua PRÓPRIA instância deste módulo — runWithStore() setando
// o contexto numa AsyncLocalStorage e currentStoreId() lendo de outra (sempre
// null). É exatamente o que causava "Argument `store` is missing" no Prisma:
// o storeId nunca chegava a ser injetado porque a extensão lia a instância errada.
const g = globalThis as unknown as { tenantAls?: AsyncLocalStorage<TenantStore> };
const als = g.tenantAls ?? new AsyncLocalStorage<TenantStore>();
if (process.env.NODE_ENV !== "production") g.tenantAls = als;

export function runWithStore<T>(storeId: string, fn: () => Promise<T>): Promise<T> {
  return als.run({ storeId }, fn);
}

export function currentStoreId(): string | null {
  return als.getStore()?.storeId ?? null;
}
