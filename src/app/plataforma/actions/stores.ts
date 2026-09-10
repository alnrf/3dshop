// app/plataforma/actions/stores.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { hashPassword, generateProvisionalPassword } from "@/lib/password";
import { sendMail } from "@/lib/mail";
import { downgradeStoreToFree, ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/plans";

export type ApproveStoreResult =
  | { ok: true; email: string; provisionalPassword: string }
  | { ok: false; error: string };

/**
 * Aprova uma loja pendente: gera a senha provisória do dono, ativa a loja e
 * "envia" (stub) o e-mail com as credenciais. A senha também volta na resposta
 * porque hoje não há provedor de e-mail real — é assim que ela chega até você.
 */
export async function approveStoreAction(storeId: string): Promise<ApproveStoreResult> {
  await requirePlatformAdmin();

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { ok: false, error: "Loja não encontrada" };
  if (store.status === "active") return { ok: false, error: "Loja já está ativa" };

  const membership = await prisma.membership.findFirst({
    where: { storeId, role: "owner" },
    include: { user: true },
  });
  if (!membership) return { ok: false, error: "Loja sem dono cadastrado" };

  const provisionalPassword = generateProvisionalPassword();

  await prisma.$transaction([
    prisma.user.update({
      where: { id: membership.userId },
      data: { passwordHash: hashPassword(provisionalPassword), mustChangePassword: true },
    }),
    prisma.store.update({ where: { id: storeId }, data: { status: "active" } }),
  ]);

  await sendMail({
    to: membership.user.email,
    subject: `Sua loja "${store.name}" foi aprovada`,
    body:
      `Olá, ${membership.user.name ?? ""}!\n\n` +
      `Sua loja foi aprovada. Acesse o painel com as credenciais abaixo e troque a senha no primeiro login:\n\n` +
      `E-mail: ${membership.user.email}\nSenha provisória: ${provisionalPassword}\n`,
  });

  revalidatePath("/plataforma/lojas");
  return { ok: true, email: membership.user.email, provisionalPassword };
}

export type RejectStoreResult = { ok: true } | { ok: false; error: string };

/**
 * Reprova uma loja pendente: marca como "rejected", sem apagar o cadastro
 * (histórico fica disponível caso o dono entre em contato).
 */
export async function rejectStoreAction(storeId: string): Promise<RejectStoreResult> {
  await requirePlatformAdmin();

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { ok: false, error: "Loja não encontrada" };
  if (store.status !== "pending") return { ok: false, error: "Só é possível reprovar lojas pendentes" };

  await prisma.store.update({ where: { id: storeId }, data: { status: "rejected" } });

  revalidatePath("/plataforma/lojas");
  return { ok: true };
}

// ─── Dados do dono ────────────────────────────────────────────────────────────

const UpdateStoreOwnerSchema = z.object({
  name: z.string().min(1, "Informe o nome"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(1, "Informe o telefone"),
  cnpj: z.string().min(1, "Informe o CNPJ"),
});
export type UpdateStoreOwnerInput = z.input<typeof UpdateStoreOwnerSchema>;
export type UpdateStoreOwnerResult = { ok: true } | { ok: false; error: string };

/**
 * Edita nome/e-mail/telefone/CNPJ do dono da loja. Único ponto do sistema que
 * pode mudar e-mail e CNPJ depois de cadastrados — no /admin do lojista esses
 * dois campos são travados de propósito (ver app/admin/actions/profile.ts).
 */
export async function updateStoreOwnerAction(
  storeId: string,
  input: UpdateStoreOwnerInput,
): Promise<UpdateStoreOwnerResult> {
  await requirePlatformAdmin();

  const parsed = UpdateStoreOwnerSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { name, phone, cnpj } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const membership = await prisma.membership.findFirst({ where: { storeId, role: "owner" } });
  if (!membership) return { ok: false, error: "Loja sem dono cadastrado" };

  const emailTaken = await prisma.user.findUnique({ where: { email } });
  if (emailTaken && emailTaken.id !== membership.userId) {
    return { ok: false, error: "Este e-mail já está em uso por outro usuário" };
  }

  await prisma.user.update({ where: { id: membership.userId }, data: { name, email, phone, cnpj } });

  revalidatePath(`/plataforma/lojas/${storeId}`);
  revalidatePath("/plataforma/lojas");
  return { ok: true };
}

// ─── Plano ────────────────────────────────────────────────────────────────────

const UpdateStorePlanSchema = z.object({ plan: z.enum(["free", "pro"]) });
export type UpdateStorePlanInput = z.input<typeof UpdateStorePlanSchema>;
export type UpdateStorePlanResult = { ok: true } | { ok: false; error: string };

/**
 * Troca o plano da loja por fora do Stripe — cortesia pra um lojista, sua
 * própria loja, ou qualquer caso em que não deve haver cobrança real. Convive
 * com o billing de verdade (app/admin/plano): o Stripe continua sendo quem
 * decide o plano de quem paga, via webhook; isso aqui é a exceção manual.
 */
export async function updateStorePlanAction(
  storeId: string,
  input: UpdateStorePlanInput,
): Promise<UpdateStorePlanResult> {
  await requirePlatformAdmin();

  const parsed = UpdateStorePlanSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Plano inválido" };

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { ok: false, error: "Loja não encontrada" };

  if (parsed.data.plan === "free") {
    // Mesma regra do cancelamento via Stripe: mantém os 10 mais antigos ativos.
    await downgradeStoreToFree(storeId);
  } else {
    // Se sobrou vínculo de uma assinatura Stripe que não está mais em dia
    // (ex.: cancelada antes), limpa — senão a tela de detalhe mostraria esse
    // status velho ("Cancelada") em vez de deixar claro que agora é cortesia.
    // Uma assinatura REALMENTE ativa nunca é tocada aqui.
    const staleSubscription = !ACTIVE_SUBSCRIPTION_STATUSES.has(store.subscriptionStatus ?? "");
    await prisma.store.update({
      where: { id: storeId },
      data: {
        plan: parsed.data.plan,
        ...(staleSubscription ? { stripeSubscriptionId: null, subscriptionStatus: null } : {}),
      },
    });
  }

  revalidatePath(`/plataforma/lojas/${storeId}`);
  revalidatePath("/plataforma/lojas");
  revalidatePath("/admin/produtos");
  return { ok: true };
}

// ─── Inativar / reativar / excluir ─────────────────────────────────────────────

export type SuspendStoreResult = { ok: true } | { ok: false; error: string };

/**
 * Inativa uma loja ativa. Reversível, sem apagar nada: com status !== "active"
 * a vitrine (resolveStore) e o painel do lojista (getActiveStoreId) já barram
 * o acesso sozinhos — não precisa desativar produto por produto, e reativar
 * restaura tudo exatamente como estava.
 */
export async function suspendStoreAction(storeId: string): Promise<SuspendStoreResult> {
  await requirePlatformAdmin();

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { ok: false, error: "Loja não encontrada" };
  if (store.status !== "active") return { ok: false, error: "Só é possível inativar lojas ativas" };

  await prisma.store.update({ where: { id: storeId }, data: { status: "suspended" } });

  revalidatePath(`/plataforma/lojas/${storeId}`);
  revalidatePath("/plataforma/lojas");
  return { ok: true };
}

export async function reactivateStoreAction(storeId: string): Promise<SuspendStoreResult> {
  await requirePlatformAdmin();

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { ok: false, error: "Loja não encontrada" };
  if (store.status !== "suspended") return { ok: false, error: "Só é possível reativar lojas inativas" };

  await prisma.store.update({ where: { id: storeId }, data: { status: "active" } });

  revalidatePath(`/plataforma/lojas/${storeId}`);
  revalidatePath("/plataforma/lojas");
  return { ok: true };
}

export type DeleteStoreResult = { ok: true } | { ok: false; error: string };

/**
 * Exclui a loja de verdade (cascade no schema apaga produtos, clientes,
 * carrinhos, pedidos e pagamentos junto). Só permitido se ela NUNCA teve
 * pedido — mesma regra já usada em deleteProductFormAction: histórico de
 * venda não é apagável. Com pedido no histórico, a saída é inativar.
 */
export async function deleteStoreAction(storeId: string): Promise<DeleteStoreResult> {
  await requirePlatformAdmin();

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store) return { ok: false, error: "Loja não encontrada" };

  const orderCount = await prisma.order.count({ where: { storeId } });
  if (orderCount > 0) {
    return {
      ok: false,
      error: `Esta loja já teve ${orderCount} pedido(s) — exclusão não é permitida, pra preservar o histórico. Inative em vez disso.`,
    };
  }

  await prisma.store.delete({ where: { id: storeId } });

  revalidatePath("/plataforma/lojas");
  return { ok: true };
}
