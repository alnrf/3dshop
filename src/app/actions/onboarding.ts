// app/actions/onboarding.ts — cadastro público de novos tenants. Única action
// do projeto sem checagem de sessão: qualquer visitante pode chamar.
"use server";

import { z } from "zod";
import { MemberRole } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/format";

const OnboardingSchema = z.object({
  ownerName: z.string().min(1, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().min(1, "Informe seu telefone"),
  cnpj: z.string().min(1, "Informe o CNPJ"),
  storeName: z.string().min(1, "Informe o nome da loja"),
  contractAccepted: z.boolean().refine((v) => v === true, "É preciso aceitar o contrato de serviço"),
});

export type OnboardingInput = z.input<typeof OnboardingSchema>;
export type OnboardingResult = { ok: true } | { ok: false; error: string };

export async function submitOnboardingAction(input: OnboardingInput): Promise<OnboardingResult> {
  const parsed = OnboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const { ownerName, storeName, phone, cnpj } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const slug = slugify(storeName);
  if (!slug) return { ok: false, error: "Nome de loja inválido" };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) return { ok: false, error: "Este e-mail já está cadastrado" };

  const existingStore = await prisma.store.findUnique({ where: { slug } });
  if (existingStore) return { ok: false, error: "Este nome de loja já está em uso, escolha outro" };

  try {
    await prisma.$transaction(async (tx) => {
      const store = await tx.store.create({
        data: { slug, name: storeName, status: "pending", contractAcceptedAt: new Date() },
      });
      const user = await tx.user.create({ data: { email, name: ownerName, phone, cnpj } });
      await tx.membership.create({
        data: { userId: user.id, storeId: store.id, role: MemberRole.owner },
      });
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Não foi possível concluir o cadastro. Tente novamente." };
  }
}
