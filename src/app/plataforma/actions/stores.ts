// app/plataforma/actions/stores.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { hashPassword, generateProvisionalPassword } from "@/lib/password";
import { sendMail } from "@/lib/mail";

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
