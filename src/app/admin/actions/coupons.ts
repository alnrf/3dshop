// app/admin/actions/coupons.ts
"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess, getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";

/** Código normalizado: maiúsculo, sem espaços — evita "promo10" e "PROMO 10" colidirem/confundirem. */
function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

// Mesmo motivo do invalid_type_error em products.ts: campo numérico vazio/
// inválido no form chega aqui como NaN, e sem invalid_type_error a mensagem
// crua do Zod ("Expected number, received nan") vazaria pro lojista.
const CouponSchema = z
  .object({
    code: z.string().min(1, "Informe o código"),
    type: z.enum(["percentage", "fixed", "free_shipping"]),
    percentOff: z.number({ invalid_type_error: "Percentual inválido" }).int().min(1).max(100).optional(),
    valueCents: z.number({ invalid_type_error: "Valor inválido" }).int().positive().optional(),
    active: z.boolean(),
    startsAt: z.date().optional(),
    expiresAt: z.date().optional(),
    maxUses: z.number({ invalid_type_error: "Limite de usos inválido" }).int().positive().optional(),
    minOrderCents: z.number({ invalid_type_error: "Pedido mínimo inválido" }).int().min(0).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percentage" && !data.percentOff) {
      ctx.addIssue({ code: "custom", path: ["percentOff"], message: "Informe o percentual de desconto" });
    }
    if (data.type === "fixed" && !data.valueCents) {
      ctx.addIssue({ code: "custom", path: ["valueCents"], message: "Informe o valor do desconto" });
    }
    if (data.startsAt && data.expiresAt && data.expiresAt < data.startsAt) {
      ctx.addIssue({ code: "custom", path: ["expiresAt"], message: "Data de término deve ser após o início" });
    }
  });

export type CouponInput = {
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  percentOff?: number;
  valueCents?: number;
  active: boolean;
  startsAt?: Date;
  expiresAt?: Date;
  maxUses?: number;
  minOrderCents?: number;
};
export type CouponResult = { ok: true; id: string } | { ok: false; error: string };

function revalidateCoupons() {
  revalidatePath("/admin/cupons");
}

/** Mesmo padrão de products.ts: loga o erro real, só mostra mensagem específica numa colisão de código de verdade. */
function describeSaveError(err: unknown): string {
  console.error("Falha ao salvar cupom:", err);
  if (
    err instanceof Prisma.PrismaClientKnownRequestError &&
    err.code === "P2002" &&
    (err.meta?.target as string[] | undefined)?.includes("code")
  ) {
    return "Não foi possível salvar — esse código já existe nesta loja.";
  }
  return "Não foi possível salvar. Tente novamente.";
}

function clearIgnoredFields(data: z.infer<typeof CouponSchema>) {
  // Campos que não fazem sentido pro tipo escolhido ficam null, não só ausentes,
  // pra não deixar sobra de uma edição anterior (ex.: trocou fixed -> free_shipping).
  return {
    ...data,
    percentOff: data.type === "percentage" ? data.percentOff! : null,
    valueCents: data.type === "fixed" ? data.valueCents! : null,
    startsAt: data.startsAt ?? null,
    expiresAt: data.expiresAt ?? null,
    maxUses: data.maxUses ?? null,
    minOrderCents: data.minOrderCents ?? null,
  };
}

export async function createCouponAction(input: CouponInput): Promise<CouponResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  const parsed = CouponSchema.safeParse({ ...input, code: normalizeCouponCode(input.code) });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = clearIgnoredFields(parsed.data);

  return runWithStore(storeId, async () => {
    try {
      const coupon = await prisma.coupon.create({ data }); // storeId injetado pela extensão
      revalidateCoupons();
      return { ok: true, id: coupon.id };
    } catch (err) {
      return { ok: false, error: describeSaveError(err) };
    }
  });
}

export async function updateCouponAction(id: string, input: CouponInput): Promise<CouponResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  const parsed = CouponSchema.safeParse({ ...input, code: normalizeCouponCode(input.code) });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const data = clearIgnoredFields(parsed.data);

  return runWithStore(storeId, async () => {
    const owned = await prisma.coupon.findUnique({ where: { id } }); // extensão devolve null se for de outra loja
    if (!owned) return { ok: false, error: "Cupom não encontrado" };

    try {
      await prisma.coupon.update({ where: { id }, data });
      revalidateCoupons();
      return { ok: true, id };
    } catch (err) {
      return { ok: false, error: describeSaveError(err) };
    }
  });
}

/** Ativa/desativa via <form>. updateMany é escopado pela extensão (where + storeId). */
export async function toggleCouponActiveFormAction(formData: FormData) {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const id = String(formData.get("id"));
  const active = formData.get("active") === "true";

  await runWithStore(storeId, async () => {
    await prisma.coupon.updateMany({ where: { id }, data: { active } });
    revalidateCoupons();
  });
}

/** Cupons não têm histórico vinculado (diferente de produto/pedido) — exclusão é sempre definitiva. */
export async function deleteCouponFormAction(formData: FormData) {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const id = String(formData.get("id"));

  await runWithStore(storeId, async () => {
    await prisma.coupon.deleteMany({ where: { id } });
    revalidateCoupons();
  });
}
