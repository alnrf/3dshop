// app/admin/pedidos/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { formatBRL } from "@/lib/format";
import { r2Url } from "@/lib/r2";
import { markOrderPaidFormAction } from "@/app/admin/actions/orders";
import { MANUAL_PAYMENT_METHODS, MANUAL_PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import { OrderStepper } from "@/app/loja/[slug]/pedido/[id]/order-stepper";

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  approved: "Aprovado",
  rejected: "Recusado",
  refunded: "Reembolsado",
};

const PAYMENT_KIND_LABEL: Record<string, string> = {
  full: "Integral",
  deposit: "Sinal",
  balance: "Saldo",
};

export default async function PedidoAdminPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storeId = await getActiveStoreId(); // acesso já barrado no layout

  const [order, store] = await runWithStore(storeId, () =>
    Promise.all([
      prisma.order.findUnique({
        where: { id },
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          items: {
            include: {
              product: {
                select: { name: true, slug: true, images: { orderBy: { position: "asc" }, take: 1 } },
              },
            },
          },
          payments: { orderBy: { createdAt: "desc" } },
        },
      }),
      prisma.store.findUnique({ where: { id: storeId }, select: { slug: true } }),
    ]),
  );
  if (!order) notFound(); // extensão de tenant já devolve null se o pedido é de outra loja
  const storeSlug = store?.slug;

  const address = order.shippingAddress as {
    recipient?: string;
    cep?: string;
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  } | null;

  const payment = order.payments[0] ?? null;

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/admin/pedidos" className="text-sm text-neutral-500 hover:underline">
        ← Voltar
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-medium">Pedido #{order.id.slice(-6)}</h1>
        <span className="text-sm text-neutral-500">{order.createdAt.toLocaleDateString("pt-BR")}</span>
      </div>

      <div className="mt-6 rounded-lg border border-neutral-200 bg-white p-4">
        <OrderStepper status={order.fulfillmentStatus} madeToOrder={order.madeToOrder} />
      </div>

      <section className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">Cliente</h2>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-neutral-500">Nome</dt>
            <dd className="font-medium">{order.customer.name}</dd>
          </div>
          <div>
            <dt className="text-neutral-500">E-mail</dt>
            <dd className="font-medium">{order.customer.email}</dd>
          </div>
          {order.customer.phone && (
            <div>
              <dt className="text-neutral-500">Telefone</dt>
              <dd className="font-medium">{order.customer.phone}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">Entrega</h2>
        {address ? (
          <p className="mt-2 text-sm text-neutral-700">
            {address.recipient && (
              <>
                {address.recipient}
                <br />
              </>
            )}
            {address.street}, {address.number}
            {address.complement && ` — ${address.complement}`}
            <br />
            {address.neighborhood} — {address.city}/{address.state}
            <br />
            CEP {address.cep}
          </p>
        ) : (
          <p className="mt-2 text-sm text-neutral-400">Endereço não informado.</p>
        )}
        {order.trackingCode && (
          <p className="mt-3 text-sm text-neutral-700">
            <span className="text-neutral-500">Rastreio:</span> {order.trackingCode}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">Pagamento</h2>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-neutral-500">Status</dt>
            <dd className="font-medium">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</dd>
          </div>
          {payment && (
            <div>
              <dt className="text-neutral-500">Forma</dt>
              <dd className="font-medium">{PAYMENT_KIND_LABEL[payment.kind] ?? payment.kind}</dd>
            </div>
          )}
          {payment?.method && (
            <div>
              <dt className="text-neutral-500">Recebido via</dt>
              <dd className="font-medium">
                {MANUAL_PAYMENT_METHOD_LABEL[payment.method as keyof typeof MANUAL_PAYMENT_METHOD_LABEL] ??
                  payment.method}
              </dd>
            </div>
          )}
        </dl>
        {order.paymentStatus === "pending" && (
          <form action={markOrderPaidFormAction} className="mt-4 flex items-center gap-2">
            <input type="hidden" name="id" value={order.id} />
            <select name="method" required defaultValue="" className="h-9 rounded-lg border border-neutral-300 px-2 text-sm">
              <option value="" disabled>
                Forma de pagamento…
              </option>
              {MANUAL_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {MANUAL_PAYMENT_METHOD_LABEL[m]}
                </option>
              ))}
            </select>
            <button className="h-9 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800">
              Marcar como pago
            </button>
          </form>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">Itens</h2>
        <ul className="mt-2 divide-y divide-neutral-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-2 text-sm">
              <Image
                src={r2Url(item.product.images[0]?.r2Key)}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-md bg-neutral-100 object-cover"
              />
              <span className="flex-1">
                {item.qty}×{" "}
                {storeSlug ? (
                  <Link
                    href={`/loja/${storeSlug}/produto/${item.product.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {item.product.name}
                  </Link>
                ) : (
                  item.product.name
                )}
              </span>
              <span className="tabular-nums">{formatBRL(item.unitPriceCents * item.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-neutral-100 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-neutral-500">Subtotal</dt>
            <dd className="tabular-nums">{formatBRL(order.subtotalCents)}</dd>
          </div>
          {order.couponCode && (
            <div className="flex justify-between text-green-700">
              <dt>Cupom {order.couponCode}</dt>
              <dd className="tabular-nums">
                {order.couponType === "free_shipping" ? "Frete grátis" : `-${formatBRL(order.discountCents)}`}
              </dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-neutral-500">Frete</dt>
            <dd className="tabular-nums">{formatBRL(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatBRL(order.totalCents)}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
