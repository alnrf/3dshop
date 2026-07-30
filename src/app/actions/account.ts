// app/actions/account.ts
"use server";

import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/password";

const NewPasswordSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres");

export type ChangePasswordResult = { ok: true } | { ok: false; error: string };

export async function changePasswordAction(newPassword: string): Promise<ChangePasswordResult> {
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) return { ok: false, error: "Não autenticado" };

  const parsed = NewPasswordSchema.safeParse(newPassword);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Senha inválida" };

  await prisma.user.update({
    where: { email },
    data: { passwordHash: hashPassword(parsed.data), mustChangePassword: false },
  });
  return { ok: true };
}
