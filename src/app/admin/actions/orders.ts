// app/admin/actions/orders.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess, getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { MANUAL_PAYMENT_METHODS } from "@/lib/payment-methods";
import { cancelOrder, type CancelOrderResult } from "@/lib/orders-cancel";
import { generateShippingLabel, type GenerateLabelResult } from "@/lib/shipping-label";
import { fetchLabelPrintUrl } from "@/lib/superfrete";
import { decryptSecret } from "@/lib/crypto";
import type { ShippingConfig } from "@/app/admin/actions/settings";

/**
 * Marca manualmente como pago — não há gateway/webhook ainda nesta fase do
 * checkout, então esta é a única forma de um pedido sair de "pending".
 * `method` registra como o pagamento foi recebido (pix/cartão/dinheiro), só
 * pra controle do lojista — não afeta nada do fluxo de verdade.
 */
export async function markOrderPaidFormAction(formData: FormData) {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const id = String(formData.get("id"));
  const rawMethod = String(formData.get("method") ?? "");
  const method = (MANUAL_PAYMENT_METHODS as readonly string[]).includes(rawMethod) ? rawMethod : null;

  await runWithStore(storeId, async () => {
    // order.updateMany é escopado por storeId pela extensão de tenant; só
    // segue pro Payment (que NÃO é TENANT_MODEL, então não tem esse escopo
    // automático) se de fato atualizou um pedido desta loja — senão um id de
    // pedido de outra loja poderia alterar o Payment de outro tenant.
    const res = await prisma.order.updateMany({
      where: { id },
      data: { paymentStatus: "approved", fulfillmentStatus: "paid" },
    });
    if (res.count === 1) {
      await prisma.payment.updateMany({ where: { orderId: id }, data: { status: "approved", method } });
    }
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${id}`);
  });
}

/**
 * Cancela um pedido (lojista, sem limite de prazo — só a trava de etapa em
 * cancelOrder). Não é <form action> cru como as outras: estorno pode falhar e
 * quem clicou precisa ver o erro, não um silêncio (dinheiro real em jogo).
 */
export async function cancelOrderAction(id: string): Promise<CancelOrderResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const res = await runWithStore(storeId, () => cancelOrder(id, storeId));
  if (res.ok) {
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${id}`);
  }
  return res;
}

/** Compra a etiqueta de verdade na SuperFrete (saldo da carteira da loja). */
export async function generateShippingLabelAction(orderId: string): Promise<GenerateLabelResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const res = await runWithStore(storeId, () => generateShippingLabel(orderId, storeId));
  if (res.ok) {
    revalidatePath("/admin/pedidos");
    revalidatePath(`/admin/pedidos/${orderId}`);
  }
  return res;
}

export type GetLabelUrlResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Busca um link NOVO pro PDF da etiqueta (pode expirar) em vez de confiar na
 * cópia guardada em Order.shippingLabelUrl; cai pra essa cópia se a busca falhar.
 */
export async function getShippingLabelUrlAction(orderId: string): Promise<GetLabelUrlResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  return runWithStore(storeId, async () => {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { shippingProviderOrderId: true, shippingLabelUrl: true },
    });
    if (!order?.shippingProviderOrderId) return { ok: false, error: "Etiqueta não encontrada." };

    const store = await prisma.store.findUnique({ where: { id: storeId }, select: { shippingConfig: true } });
    const sfCfg = (store?.shippingConfig as ShippingConfig | null)?.providers?.superfrete;
    if (sfCfg?.apiToken) {
      const fresh = await fetchLabelPrintUrl({
        sandbox: sfCfg.sandbox,
        apiToken: decryptSecret(sfCfg.apiToken),
        providerOrderId: order.shippingProviderOrderId,
      });
      if (fresh) return { ok: true, url: fresh };
    }

    if (order.shippingLabelUrl) return { ok: true, url: order.shippingLabelUrl };
    return { ok: false, error: "Não foi possível obter o link da etiqueta agora." };
  });
}
