// app/actions/customer-profile.ts — edição de dados cadastrais do comprador
// (nome, telefone, CPF pra nota fiscal, endereço). Diferente de customer-auth.ts:
// aqui não há login envolvido, só atualização de um Customer já autenticado.
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withStore } from "@/lib/tenant";
import { currentCustomer, type CustomerAddress } from "@/lib/customer";

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
  phone: z.string().optional(),
  cpf: z.string().optional(),
  address: AddressInputSchema,
});
export type UpdateProfileInput = z.input<typeof ProfileSchema>;
export type UpdateProfileResult = { ok: true } | { ok: false; error: string };

/** Sem rua preenchida = sem endereço salvo (array vazio, não SQL NULL — mais
 *  simples de escrever/ler que Prisma.DbNull pra um campo Json). */
function normalizeAddress(input: z.infer<typeof AddressInputSchema>): CustomerAddress[] {
  const street = input.street?.trim();
  if (!street) return [];

  return [
    {
      cep: input.cep?.replace(/\D/g, "") ?? "",
      street,
      number: input.number?.trim() ?? "",
      neighborhood: input.neighborhood?.trim() ?? "",
      city: input.city?.trim() ?? "",
      state: input.state?.trim().toUpperCase() ?? "",
      ...(input.complement?.trim() ? { complement: input.complement.trim() } : {}),
    },
  ];
}

export async function updateCustomerProfileAction(input: UpdateProfileInput): Promise<UpdateProfileResult> {
  const parsed = ProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const { name, address } = parsed.data;
  const phone = parsed.data.phone?.replace(/\D/g, "") || null;
  const cpf = parsed.data.cpf?.replace(/\D/g, "") || null;

  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Não autenticado" };

  const updated = await withStore(async () => {
    const customer = await currentCustomer(session.user?.email);
    if (!customer) return false;

    // updateMany (não update por id): é o que a extensão de tenant escopa de
    // verdade por storeId — update por id sozinho não é protegido (lib/prisma.ts).
    await prisma.customer.updateMany({
      where: { id: customer.id },
      data: { name, phone, cpf, addresses: normalizeAddress(address) },
    });
    return true;
  });

  if (!updated) return { ok: false, error: "Cliente não encontrado" };

  revalidatePath("/loja", "layout");
  return { ok: true };
}
