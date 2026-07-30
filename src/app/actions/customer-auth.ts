// app/actions/customer-auth.ts — cadastro/login do comprador por e-mail/senha,
// por loja. Google continua funcionando em paralelo (mesmo Customer, resolvido
// por e-mail via lib/customer.ts).
"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { resolveStore } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { hashPassword } from "@/lib/password";

const RegisterSchema = z.object({
  storeSlug: z.string().min(1),
  name: z.string().min(1, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});
export type RegisterCustomerInput = z.input<typeof RegisterSchema>;

const LoginSchema = z.object({
  storeSlug: z.string().min(1),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
export type LoginCustomerInput = z.input<typeof LoginSchema>;

export type CustomerAuthResult = { ok: true } | { ok: false; error: string };

export async function registerCustomerAction(input: RegisterCustomerInput): Promise<CustomerAuthResult> {
  const parsed = RegisterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { storeSlug, name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const store = await resolveStore(storeSlug);
  if (!store) return { ok: false, error: "Loja não encontrada" };

  const existing = await prisma.customer.findUnique({
    where: { storeId_email: { storeId: store.id, email } },
  });
  if (existing) return { ok: false, error: "Este e-mail já está cadastrado nesta loja" };

  // Callback precisa ser async: Prisma Promise é lazy, então um arrow síncrono
  // que só repassa a chamada perde o contexto do AsyncLocalStorage antes da
  // extensão de tenant rodar (storeId chegaria null em prisma.ts).
  await runWithStore(store.id, async () =>
    prisma.customer.create({ data: { email, name, passwordHash: hashPassword(password) } }),
  );

  return loginCustomerAction({ storeSlug, email, password });
}

export async function loginCustomerAction(input: LoginCustomerInput): Promise<CustomerAuthResult> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { storeSlug, email, password } = parsed.data;

  try {
    await signIn("customer", { email, password, storeSlug, redirect: false });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: "E-mail ou senha inválidos" };
    throw err;
  }
}
