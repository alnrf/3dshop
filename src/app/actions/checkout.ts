// app/actions/checkout.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { getCartWithItems } from "@/lib/cart";
import { validateCoupon, consumeCoupon } from "@/lib/coupons";
import { DEFAULT_FLAT_SHIPPING_CENTS } from "@/lib/checkout";

const AddressSchema = z.object({
  cep: z.string().min(1, "Informe o CEP"),
  street: z.string().min(1, "Informe a rua"),
  number: z.string().min(1, "Informe o número"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Informe o bairro"),
  city: z.string().min(1, "Informe a cidade"),
  state: z.string().length(2, "Informe a UF"),
});

const CreateOrderSchema = z.object({
  address: AddressSchema,
  couponCode: z.string().optional(),
});
export type CreateOrderInput = z.input<typeof CreateOrderSchema>;
export type CreateOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

export type CouponPreviewResult =
  | { ok: true; discountCents: number; freeShipping: boolean }
  | { ok: false; error: string };

/** Erro "esperado" (estoque, cupom inválido, etc.) — mensagem já é segura pro comprador ver. */
class CheckoutError extends Error {}

/** Pré-visualização do cupom no form, antes de finalizar — não consome usedCount. */
export async function previewCouponAction(code: string): Promise<CouponPreviewResult> {
  const session = await auth();
  const result = await withStore(async () => {
    const customer = await currentCustomer(session?.user?.email);
    if (!customer) return { ok: false as const, error: "Entre para aplicar um cupom" };
    const cart = await getCartWithItems(customer.id);
    const v = await validateCoupon(code, cart.totalCents);
    if (!v.ok) return v;
    return { ok: true as const, discountCents: v.discountCents, freeShipping: v.freeShipping };
  });
  return result ?? { ok: false, error: "Loja não encontrada" };
}

export async function createOrderAction(input: CreateOrderInput): Promise<CreateOrderResult> {
  const parsed = CreateOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Não autenticado" };
  const email = session.user.email;
  const name = session.user.name;

  const result = await withStore(async (storeId) => {
    const customer = await currentCustomer(email);
    if (!customer) return { ok: false as const, error: "Cliente não encontrado" };

    const cart = await getCartWithItems(customer.id);
    if (cart.items.length === 0 || !cart.id) return { ok: false as const, error: "Carrinho vazio" };
    const cartId = cart.id;

    try {
      return await prisma.$transaction(async (tx) => {
        let subtotalCents = 0;
        const lines: { productId: string; qty: number; unitPriceCents: number; name: string }[] = [];
        for (const item of cart.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || !product.active) throw new CheckoutError(`"${item.product.name}" não está mais disponível`);
          if (product.stock < item.qty) throw new CheckoutError(`Estoque insuficiente para "${product.name}"`);
          lines.push({ productId: product.id, qty: item.qty, unitPriceCents: product.priceCents, name: product.name });
          subtotalCents += product.priceCents * item.qty;
        }

        // lib/cart.ts já limita addToCart/setItemQty ao estoque do produto
        // (rejeita item com stock=0), então "sem estoque no momento da
        // compra" nunca acontece por este fluxo — madeToOrder fica sempre
        // false até existir uma flag de impressão sob encomenda no produto.
        const madeToOrder = false;

        let discountCents = 0;
        let freeShipping = false;
        let couponId: string | undefined;
        let couponCode: string | undefined;
        let couponType: "percentage" | "fixed" | "free_shipping" | undefined;

        if (parsed.data.couponCode) {
          const v = await validateCoupon(parsed.data.couponCode, subtotalCents, tx);
          if (!v.ok) throw new CheckoutError(v.error);
          const consumed = await consumeCoupon(v.coupon, tx);
          if (!consumed) throw new CheckoutError("Cupom esgotado");
          discountCents = v.discountCents;
          freeShipping = v.freeShipping;
          couponId = v.coupon.id;
          couponCode = v.coupon.code;
          couponType = v.coupon.type;
        }

        const store = await tx.store.findUnique({
          where: { id: storeId },
          select: { flatShippingCents: true, freeShippingThresholdCents: true },
        });
        const threshold = store?.freeShippingThresholdCents;
        let shippingCents =
          threshold != null && subtotalCents >= threshold
            ? 0
            : store?.flatShippingCents ?? DEFAULT_FLAT_SHIPPING_CENTS;
        if (freeShipping) shippingCents = 0;

        const totalCents = subtotalCents - discountCents + shippingCents;

        const order = await tx.order.create({
          data: {
            customerId: customer.id,
            subtotalCents,
            shippingCents,
            discountCents,
            totalCents,
            madeToOrder,
            couponId,
            couponCode,
            couponType,
            shippingAddress: { recipient: name ?? customer.name, ...parsed.data.address },
            items: { create: lines.map(({ productId, qty, unitPriceCents }) => ({ productId, qty, unitPriceCents })) },
            payments: { create: { amountCents: totalCents, status: "pending" } },
          },
        });

        for (const line of lines) {
          const res = await tx.product.updateMany({
            where: { id: line.productId, stock: { gte: line.qty } },
            data: { stock: { decrement: line.qty } },
          });
          if (res.count === 0) throw new CheckoutError(`Estoque insuficiente para concluir a compra de "${line.name}"`);
        }

        await tx.cartItem.deleteMany({ where: { cartId } });

        return { ok: true as const, orderId: order.id };
      });
    } catch (e) {
      if (e instanceof CheckoutError) return { ok: false as const, error: e.message };
      console.error("Falha ao criar pedido:", e);
      return { ok: false as const, error: "Não foi possível concluir o pedido. Tente novamente." };
    }
  });

  if (!result) return { ok: false, error: "Loja não encontrada" };
  if (result.ok) revalidatePath("/loja", "layout");
  return result;
}
