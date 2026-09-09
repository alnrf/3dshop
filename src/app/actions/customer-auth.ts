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
import { hashPassword, generateResetToken, hashToken } from "@/lib/password";
import { sendMail } from "@/lib/mail";
import { baseUrl } from "@/lib/url";

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

// ─── Recuperação de senha ──────────────────────────────────────────────────────

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h

const ForgotPasswordSchema = z.object({
  storeSlug: z.string().min(1),
  email: z.string().email("E-mail inválido"),
});
export type ForgotPasswordInput = z.input<typeof ForgotPasswordSchema>;

/**
 * Sempre responde ok — nunca revela se o e-mail existe nesta loja (evita
 * enumeração de contas). O link só sai de fato se o Customer existir.
 */
export async function requestPasswordResetAction(input: ForgotPasswordInput): Promise<CustomerAuthResult> {
  const parsed = ForgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { storeSlug } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  const store = await resolveStore(storeSlug);
  if (!store) return { ok: false, error: "Loja não encontrada" };

  await runWithStore(store.id, async () => {
    const customer = await prisma.customer.findUnique({ where: { storeId_email: { storeId: store.id, email } } });
    if (!customer) return; // não revela ausência — só não envia nada

    const token = generateResetToken();
    await prisma.passwordResetToken.create({
      data: {
        customerId: customer.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS),
      },
    });

    const link = `${await baseUrl()}/loja/${storeSlug}/redefinir-senha?token=${token}`;
    await sendMail({
      to: customer.email,
      subject: `Redefinir sua senha em ${store.name}`,
      body:
        `Olá, ${customer.name ?? ""}!\n\n` +
        `Recebemos um pedido para redefinir sua senha. O link abaixo vale por 1 hora:\n\n${link}\n\n` +
        `Se não foi você, pode ignorar este e-mail.`,
    });
  });

  return { ok: true };
}

const ResetPasswordSchema = z.object({
  storeSlug: z.string().min(1),
  token: z.string().min(1),
  password: z.string().min(8, "A senha precisa ter pelo menos 8 caracteres"),
});
export type ResetPasswordInput = z.input<typeof ResetPasswordSchema>;

export async function resetPasswordAction(input: ResetPasswordInput): Promise<CustomerAuthResult> {
  const parsed = ResetPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { storeSlug, token, password } = parsed.data;

  const store = await resolveStore(storeSlug);
  if (!store) return { ok: false, error: "Loja não encontrada" };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { customer: true },
  });
  if (
    !record ||
    record.usedAt ||
    record.expiresAt < new Date() ||
    record.customer.storeId !== store.id
  ) {
    return { ok: false, error: "Link inválido ou expirado. Peça uma nova recuperação de senha." };
  }

  // updateMany (não update por id) pra extensão de tenant realmente aplicar o
  // filtro de storeId — update por id sozinho não é escopado (ver lib/prisma.ts).
  await runWithStore(store.id, async () => {
    await prisma.customer.updateMany({
      where: { id: record.customerId },
      data: { passwordHash: hashPassword(password) },
    });
  });
  // Fora do runWithStore: PasswordResetToken não é modelo de tenant.
  await prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } });

  return { ok: true };
}
