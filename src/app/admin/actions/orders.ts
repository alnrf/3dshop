// app/admin/actions/orders.ts
"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess, getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { MANUAL_PAYMENT_METHODS } from "@/lib/payment-methods";

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
