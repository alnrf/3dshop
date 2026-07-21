// lib/customer.ts
// Comprador (Customer) é POR LOJA — a mesma pessoa (mesmo e-mail) é um registro
// separado em cada tenant. Isso é o que impede vazamento entre lojas: o carrinho
// e os pedidos penduram no Customer da loja, nunca na identidade global de login.
// Deve rodar dentro de runWithStore (via withStore).
import { prisma } from "./prisma";
import { currentStoreId } from "./tenant-context";

export async function ensureCustomer(email: string, name?: string | null) {
  const storeId = currentStoreId();
  if (!storeId) throw new Error("Fora do contexto de loja");

  return prisma.customer.upsert({
    where: { storeId_email: { storeId, email: email.toLowerCase() } },
    update: name ? { name } : {},
    create: { storeId, email: email.toLowerCase(), name: name ?? email },
  });
}

/** Customer da sessão atual nesta loja, ou null se não logado / inexistente. */
export async function currentCustomer(email?: string | null) {
  const storeId = currentStoreId();
  if (!storeId || !email) return null;
  return prisma.customer.findUnique({
    where: { storeId_email: { storeId, email: email.toLowerCase() } },
  });
}
