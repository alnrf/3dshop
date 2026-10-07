// app/admin/actions/profile.ts — cadastro do próprio operador (dono/staff da
// loja). E-mail e CNPJ são intencionalmente fora do schema de edição: uma vez
// informados, só o admin de plataforma pode alterá-los (ver app/plataforma).
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

/** Formato guardado em User.address (Json). Pra contrato ter validade
 *  jurídica: endereço completo de quem assina. */
export type UserAddress = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
};

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
    select: { name: true, email: true, phone: true, cnpj: true, cpf: true, address: true },
  });
  return { ...user, address: (user.address as unknown as UserAddress | null) ?? null };
}

const AddressInputSchema = z.object({
  cep: z.string().optional(),
  street: z.string().optional(),
  number: z.string().optional(),
  complement: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
});

const ProfileSchema = z.object({
  name: z.string().min(1, "Informe seu nome"),
  phone: z.string().min(1, "Informe seu telefone"),
  cpf: z.string().optional(),
  address: AddressInputSchema,
});
export type ProfileInput = z.input<typeof ProfileSchema>;
export type ProfileResult = { ok: true } | { ok: false; error: string };

/** Sem rua preenchida = sem endereço salvo (null, não um objeto pela metade). */
function normalizeAddress(input: z.infer<typeof AddressInputSchema>): UserAddress | null {
  const street = input.street?.trim();
  if (!street) return null;

  return {
    cep: input.cep?.replace(/\D/g, "") ?? "",
    street,
    number: input.number?.trim() ?? "",
    neighborhood: input.neighborhood?.trim() ?? "",
    city: input.city?.trim() ?? "",
    state: input.state?.trim().toUpperCase() ?? "",
    ...(input.complement?.trim() ? { complement: input.complement.trim() } : {}),
  };
}

/** Atualiza nome, telefone, CPF e endereço. E-mail e CNPJ não são aceitos aqui de propósito. */
export async function updateProfileAction(input: ProfileInput): Promise<ProfileResult> {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const userId = await currentUserId();
  await prisma.user.update({
    where: { id: userId },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      cpf: parsed.data.cpf?.replace(/\D/g, "") || null,
      address: normalizeAddress(parsed.data.address) ?? Prisma.JsonNull,
    },
  });

  revalidatePath("/admin/perfil");
  return { ok: true };
}
