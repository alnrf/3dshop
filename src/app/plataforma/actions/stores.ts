// app/plataforma/actions/stores.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { hashPassword, generateProvisionalPassword } from "@/lib/password";
import { sendMail } from "@/lib/mail";
import { downgradeStoreToFree } from "@/lib/plans";

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
 * Troca o plano da loja. Manual porque não há billing integrado ainda (ver
 * README > Pendências conhecidas) — "assinar o Pro" hoje é o admin aprovar
 * fora do sistema e vir aqui liberar produtos ilimitados (lib/plans.ts).
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
    await prisma.store.update({ where: { id: storeId }, data: { plan: parsed.data.plan } });
  }

  revalidatePath(`/plataforma/lojas/${storeId}`);
  revalidatePath("/plataforma/lojas");
  revalidatePath("/admin/produtos");
  return { ok: true };
}
