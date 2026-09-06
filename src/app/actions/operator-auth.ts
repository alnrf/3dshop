// app/actions/operator-auth.ts — login de OPERADOR (owner da plataforma ou
// lojista) por e-mail/senha. Mesmo provider "credentials" de sempre (User),
// só isolado num action próprio para o formulário estilizado de /entrar.
// Comprador é outra identidade (Customer, por loja) — ver actions/customer-auth.ts.
"use server";

import { z } from "zod";
import { AuthError } from "next-auth";
import { signIn } from "@/auth";

const LoginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
export type LoginOperatorInput = z.input<typeof LoginSchema>;
export type OperatorAuthResult = { ok: true } | { ok: false; error: string };

export async function loginOperatorAction(input: LoginOperatorInput): Promise<OperatorAuthResult> {
  const parsed = LoginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { email, password } = parsed.data;

  try {
    await signIn("credentials", { email, password, redirect: false });
    return { ok: true };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: "E-mail ou senha inválidos" };
    throw err;
  }
}
