// app/admin/actions/profile.ts — cadastro do próprio operador (dono/staff da
// loja). E-mail e CNPJ são intencionalmente fora do schema de edição: uma vez
// informados, só o admin de plataforma pode alterá-los (ver app/plataforma).
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function currentUserId(): Promise<string> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new Error("Não autenticado");
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error("Usuário não encontrado");
  return user.id;
}

export async function getProfileAction() {
  const userId = await currentUserId();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: userId },
    select: { name: true, email: true, phone: true, cnpj: true },
  });
  return user;
}

const ProfileSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  phone: z.string().min(1, "Informe seu telefone"),
});
export type ProfileInput = z.input<typeof ProfileSchema>;
export type ProfileResult = { ok: true } | { ok: false; error: string };

/** Atualiza nome e telefone. E-mail e CNPJ não são aceitos aqui de propósito. */
export async function updateProfileAction(input: ProfileInput): Promise<ProfileResult> {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const userId = await currentUserId();
  await prisma.user.update({ where: { id: userId }, data: parsed.data });

  revalidatePath("/admin/perfil");
  return { ok: true };
}
