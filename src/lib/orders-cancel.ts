// lib/orders-cancel.ts — núcleo compartilhado do cancelamento de pedido,
// chamado tanto pelo admin (sem limite de tempo) quanto pelo cliente (janela
// de 7 dias, checada pelo chamador). Repõe estoque, libera uso de cupom e
// estorna via Stripe se o pagamento já tinha sido aprovado.
import { prisma } from "./prisma";
import { stripeClientFromConfig } from "./store-stripe";
import type { PaymentConfig } from "@/app/admin/actions/settings";

export type CancelOrderResult = { ok: true } | { ok: false; error: string };

const CANCELABLE_STATUSES = ["awaiting_payment", "paid"];

export async function cancelOrder(orderId: string, storeId: string): Promise<CancelOrderResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, payments: { orderBy: { createdAt: "desc" }, take: 1 } },
  });
  if (!order) return { ok: false, error: "Pedido não encontrado" };
  if (!CANCELABLE_STATUSES.includes(order.fulfillmentStatus)) {
    return { ok: false, error: "Este pedido não pode mais ser cancelado." };
  }

  const payment = order.payments[0];
  const wasApproved = order.paymentStatus === "approved";

  // Estorno ANTES de qualquer mudança no banco — chamada de rede nunca entra
  // em transação de banco (mesmo princípio já seguido na criação do pedido).
  if (wasApproved && payment?.provider === "stripe") {
    const paymentIntentId = (payment.rawPayload as { paymentIntentId?: string } | null)?.paymentIntentId;
    if (!paymentIntentId) {
      return { ok: false, error: "Não foi possível localizar o pagamento no Stripe para estornar." };
    }
    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { paymentConfig: true } });
    const stripeCfg = (store?.paymentConfig as PaymentConfig | null)?.providers?.stripe;
    const stripeClient = stripeClientFromConfig(stripeCfg);
    if (!stripeClient) return { ok: false, error: "Stripe não está configurado para esta loja." };
    try {
      await stripeClient.refunds.create({ payment_intent: paymentIntentId });
    } catch (e) {
      console.error("Falha ao estornar via Stripe:", orderId, e);
      return { ok: false, error: "Não foi possível estornar o pagamento. Tente novamente." };
    }
  }
  // payment?.provider !== "stripe" (manual/pix/cartão/dinheiro): sem gateway
  // pra chamar — mesmo espírito da confirmação manual, lojista acerta por fora.

  await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      await tx.product.updateMany({ where: { id: item.productId }, data: { stock: { increment: item.qty } } });
    }
    if (order.couponId) {
      await tx.coupon.updateMany({
        where: { id: order.couponId, usedCount: { gt: 0 } },
        data: { usedCount: { decrement: 1 } },
      });
    }
    if (payment) {
      await tx.payment.updateMany({
        where: { id: payment.id, orderId },
        data: { status: wasApproved ? "refunded" : payment.status },
      });
    }
    await tx.order.updateMany({
      where: { id: orderId, storeId },
      data: { fulfillmentStatus: "canceled", paymentStatus: wasApproved ? "refunded" : order.paymentStatus },
    });
  });

  return { ok: true };
}
