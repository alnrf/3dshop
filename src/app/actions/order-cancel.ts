// app/actions/order-cancel.ts — cancelamento pelo próprio cliente, dentro do
// prazo de 7 dias (direito de arrependimento, CDC). Sem esse limite de tempo
// o lojista também cancela, por src/app/admin/actions/orders.ts.
"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { cancelOrder, type CancelOrderResult } from "@/lib/orders-cancel";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export async function cancelMyOrderAction(orderId: string): Promise<CancelOrderResult> {
  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Não autenticado" };
  const email = session.user.email;

  const result = await withStore(async (storeId) => {
    const customer = await currentCustomer(email);
    if (!customer) return { ok: false as const, error: "Cliente não encontrado" };

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    // Mesmo não-disclosure de pedido/[id]/page.tsx: "não existe" e "é de
    // outro cliente" devolvem o mesmo erro, sem revelar qual dos dois é o caso.
    if (!order || order.customerId !== customer.id) return { ok: false as const, error: "Pedido não encontrado" };

    if (Date.now() - order.createdAt.getTime() > SEVEN_DAYS_MS) {
      return { ok: false as const, error: "O prazo de 7 dias para cancelamento já passou. Fale com a loja." };
    }

    return cancelOrder(orderId, storeId);
  });

  if (result?.ok) revalidatePath("/loja", "layout");
  return result ?? { ok: false, error: "Loja não encontrada" };
}
