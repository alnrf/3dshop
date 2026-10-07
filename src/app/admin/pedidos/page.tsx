// app/admin/pedidos/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { formatBRL } from "@/lib/format";
import { markOrderPaidFormAction } from "@/app/admin/actions/orders";
import { MANUAL_PAYMENT_METHODS, MANUAL_PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  refunded: "Reembolsado",
};

const FULFILLMENT_STATUS_LABEL: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  printing: "Em impressão",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
};

export default async function PedidosAdminPage() {
  const storeId = await getActiveStoreId(); // acesso já barrado no layout

  const orders = await runWithStore(storeId, () =>
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        customer: { select: { name: true, email: true } },
        payments: { orderBy: { createdAt: "desc" }, take: 1 },
      },
    }),
  );

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <h1 className="text-2xl font-medium">Pedidos</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Ainda sem gateway de pagamento conectado — confirme manualmente quando o pagamento cair.
      </p>

      {orders.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500">Nenhum pedido ainda.</p>
      ) : (
        <table className="mt-6 w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="border-b border-neutral-200 py-2 pr-3 font-medium">Pedido</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Cliente</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Data</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Total</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Pagamento</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Status</th>
              <th className="border-b border-neutral-200 py-2 pl-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} className="align-middle">
                <td className="border-b border-neutral-100 py-3 pr-3 font-medium tabular-nums">
                  <Link href={`/admin/pedidos/${o.id}`} className="hover:underline">
                    #{o.id.slice(-6)}
                  </Link>
                </td>
                <td className="border-b border-neutral-100 px-3 py-3">
                  <div>{o.customer.name}</div>
                  <div className="text-xs text-neutral-400">{o.customer.email}</div>
                </td>
                <td className="border-b border-neutral-100 px-3 py-3 text-neutral-500">
                  {o.createdAt.toLocaleDateString("pt-BR")}
                </td>
                <td className="border-b border-neutral-100 px-3 py-3 tabular-nums">{formatBRL(o.totalCents)}</td>
                <td className="border-b border-neutral-100 px-3 py-3">
                  <span
                    className={
                      o.paymentStatus === "approved"
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                        : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                    }
                  >
                    {PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus}
                  </span>
                </td>
                <td className="border-b border-neutral-100 px-3 py-3 text-neutral-600">
                  {FULFILLMENT_STATUS_LABEL[o.fulfillmentStatus] ?? o.fulfillmentStatus}
                </td>
                <td className="border-b border-neutral-100 py-3 pl-3">
                  {o.paymentStatus === "pending" ? (
                    <form action={markOrderPaidFormAction} className="flex items-center gap-1.5">
                      <input type="hidden" name="id" value={o.id} />
                      <select
                        name="method"
                        required
                        defaultValue=""
                        className="h-8 rounded border border-neutral-300 px-1.5 text-xs"
                      >
                        <option value="" disabled>
                          Forma…
                        </option>
                        {MANUAL_PAYMENT_METHODS.map((m) => (
                          <option key={m} value={m}>
                            {MANUAL_PAYMENT_METHOD_LABEL[m]}
                          </option>
                        ))}
                      </select>
                      <button className="whitespace-nowrap rounded px-2 py-1.5 text-sm text-green-700 hover:bg-green-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2">
                        Marcar como pago
                      </button>
                    </form>
                  ) : (
                    o.payments[0]?.method && (
                      <span className="text-xs text-neutral-400">
                        {MANUAL_PAYMENT_METHOD_LABEL[o.payments[0].method as keyof typeof MANUAL_PAYMENT_METHOD_LABEL] ??
                          o.payments[0].method}
                      </span>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
