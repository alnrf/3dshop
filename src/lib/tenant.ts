// lib/tenant.ts
import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { runWithStore } from "@/lib/tenant-context";

/**
 * Nível plataforma (só você). platformRole = "admin" no User.
 * Allowlist por env serve de bootstrap enquanto não há UI para promover usuários.
 */
export async function requirePlatformAdmin() {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new Error("Não autenticado");

  const bootstrap = (process.env.PLATFORM_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  const user = await prisma.user.findUnique({ where: { email } });
  const isAdmin = user?.platformRole === "admin" || bootstrap.includes(email);
  if (!isAdmin) throw new Error("Acesso restrito à plataforma");
  return { session, userId: user?.id };
}

/**
 * Nível loja (você e assinantes). Autoriza se o usuário tem Membership na loja
 * OU se é admin de plataforma. Devolve o papel para checagens finas.
 */
export async function requireStoreAccess(storeId: string) {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new Error("Não autenticado");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { where: { storeId } } },
  });

  const membership = user?.memberships[0];
  const isPlatformAdmin = user?.platformRole === "admin";
  if (!membership && !isPlatformAdmin) throw new Error("Sem acesso a esta loja");
  return { userId: user!.id, role: membership?.role ?? "owner" };
}

/** Resolve o tenant a partir do slug. */
export async function resolveStore(slug: string) {
  const store = await prisma.store.findUnique({ where: { slug } });
  if (!store || store.status !== "active") return null;
  return store;
}

/**
 * Loja ativa do operador no admin. Com loja única, é a primeira Membership.
 * No futuro multi-loja, troque pela loja selecionada (cookie/seletor).
 */
export async function getActiveStoreId(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new Error("Não autenticado");

  const user = await prisma.user.findUnique({
    where: { email },
    include: { memberships: { take: 1, orderBy: { store: { createdAt: "asc" } } } },
  });
  const storeId = user?.memberships[0]?.storeId;
  if (!storeId) throw new Error("Operador sem loja vinculada");
  return storeId;
}

/**
 * Loja do request atual no storefront, a partir do header x-store-slug.
 * cache() memoiza a resolução por request (uma consulta só, reusada em layout+pages).
 */
export const currentStore = cache(async () => {
  const slug = (await headers()).get("x-store-slug");
  if (!slug) return null;
  return resolveStore(slug);
});

/**
 * Resolve a loja atual e roda fn dentro do contexto de tenant (runWithStore),
 * para a extensão do Prisma aplicar o storeId. Retorna null se a loja não existe.
 * Use na fronteira de cada page/action do storefront.
 */
export async function withStore<T>(fn: (storeId: string) => Promise<T>): Promise<T | null> {
  const store = await currentStore();
  if (!store) return null;
  return runWithStore(store.id, () => fn(store.id));
}
