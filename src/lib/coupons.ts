// lib/coupons.ts — validação e consumo de cupom no checkout.
import type { Coupon, Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { currentStoreId } from "./tenant-context";

export type CouponValidation =
  | { ok: true; coupon: Coupon; discountCents: number; freeShipping: boolean }
  | { ok: false; error: string };

function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

type CouponClient = Pick<typeof prisma, "coupon"> | Prisma.TransactionClient;

/**
 * Valida um cupom pro subtotal informado. Aceita um client opcional (`tx`) pra
 * poder ser chamado tanto na pré-visualização (fora de transação) quanto
 * dentro da transação de criação do pedido, onde a confirmação final e o
 * incremento de usedCount acontecem — fecha a janela entre "aplicar no form"
 * e "finalizar compra" (outra pessoa pode ter esgotado o cupom nesse meio tempo).
 */
export async function validateCoupon(
  code: string,
  subtotalCents: number,
  client: CouponClient = prisma,
): Promise<CouponValidation> {
  const storeId = currentStoreId();
  if (!storeId) return { ok: false, error: "Fora do contexto de loja" };

  const coupon = await client.coupon.findUnique({
    where: { storeId_code: { storeId, code: normalizeCode(code) } },
  });
  if (!coupon || !coupon.active) return { ok: false, error: "Cupom inválido" };

  const now = new Date();
  if (coupon.startsAt && now < coupon.startsAt) return { ok: false, error: "Cupom ainda não é válido" };
  if (coupon.expiresAt && now > coupon.expiresAt) return { ok: false, error: "Cupom expirado" };
  if (coupon.maxUses != null && coupon.usedCount >= coupon.maxUses) return { ok: false, error: "Cupom esgotado" };
  if (coupon.minOrderCents != null && subtotalCents < coupon.minOrderCents) {
    return { ok: false, error: "Pedido não atinge o valor mínimo para este cupom" };
  }

  if (coupon.type === "percentage") {
    return {
      ok: true,
      coupon,
      discountCents: Math.round((subtotalCents * (coupon.percentOff ?? 0)) / 100),
      freeShipping: false,
    };
  }
  if (coupon.type === "fixed") {
    return { ok: true, coupon, discountCents: Math.min(coupon.valueCents ?? 0, subtotalCents), freeShipping: false };
  }
  return { ok: true, coupon, discountCents: 0, freeShipping: true }; // free_shipping
}

/**
 * Incrementa usedCount atomicamente, com guarda contra corrida em maxUses
 * (updateMany com where maxUses>usedCount só afeta a linha se ainda houver
 * vaga — se outra compra consumiu a última vaga primeiro, count vem 0).
 * Chame só dentro da transação de criação do pedido, depois de validateCoupon.
 */
export async function consumeCoupon(coupon: Coupon, client: CouponClient): Promise<boolean> {
  const where: Prisma.CouponWhereInput = { id: coupon.id };
  if (coupon.maxUses != null) where.usedCount = { lt: coupon.maxUses };
  const res = await client.coupon.updateMany({ where, data: { usedCount: { increment: 1 } } });
  return res.count === 1;
}
