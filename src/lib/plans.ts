// lib/plans.ts — limites por plano de assinatura (Store.plan) e a rotina de
// downgrade compartilhada pelo webhook do Stripe (cancelamento) e pela troca
// manual de plano no /plataforma (app/plataforma/actions/stores.ts).
import { prisma } from "@/lib/prisma";

export const FREE_PLAN_PRODUCT_LIMIT = 10;

/** Teto de produtos cadastrados (linhas da tabela, ativos ou não) para o plano.
 *  `null` = sem limite. Só "free" tem teto hoje; qualquer outro plano (pro, ...)
 *  é ilimitado — ajuste aqui se surgirem planos intermediários. */
export function productLimitForPlan(plan: string): number | null {
  return plan === "free" ? FREE_PLAN_PRODUCT_LIMIT : null;
}

/**
 * Volta a loja para o free: mantém ativos os FREE_PLAN_PRODUCT_LIMIT produtos
 * mais antigos (por createdAt) que já estavam ativos, e desativa o resto —
 * "os 10 primeiros continuam disponíveis, os demais ficam inativos por
 * mudança de plano". Não apaga nada: o lojista reativa manualmente depois
 * (respeitando o limite) se voltar pro Pro ou excluir outros produtos.
 * Roda direto (sem runWithStore) porque o webhook não tem contexto de request.
 */
export async function downgradeStoreToFree(storeId: string) {
  const activeProducts = await prisma.product.findMany({
    where: { storeId, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });

  const toDeactivate = activeProducts.slice(FREE_PLAN_PRODUCT_LIMIT).map((p) => p.id);

  await prisma.$transaction([
    prisma.store.update({ where: { id: storeId }, data: { plan: "free" } }),
    ...(toDeactivate.length > 0
      ? [prisma.product.updateMany({ where: { id: { in: toDeactivate } }, data: { active: false } })]
      : []),
  ]);

  return { deactivatedCount: toDeactivate.length };
}
