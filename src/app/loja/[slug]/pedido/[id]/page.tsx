// app/loja/[slug]/pedido/[id]/page.tsx
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { OrderStepper } from "./order-stepper";

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

export default async function PedidoPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { id } = await params;
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;

  const session = await auth();
  if (!session?.user) redirect(`${base}/entrar`);

  const order = await withStore(async () => {
    const customer = await currentCustomer(session.user?.email);
    if (!customer) return null;

    const found = await prisma.order.findUnique({
      where: { id },
      include: {
        items: { include: { product: { select: { name: true, slug: true } } } },
        payments: { orderBy: { createdAt: "desc" } },
      },
    });
    // Mesmo tratamento (notFound) pra "pedido não existe" e "pedido é de outro
    // cliente" — não revela qual dos dois é o caso.
    if (!found || found.customerId !== customer.id) return null;
    return found;
  });
  if (!order) notFound();

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
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`${base}/perfil`} className="text-sm text-stone-500 hover:underline">
        ← Voltar
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-xl font-medium">Pedido #{order.id.slice(-6)}</h1>
        <span className="text-sm text-stone-500">{order.createdAt.toLocaleDateString("pt-BR")}</span>
      </div>

      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <OrderStepper status={order.fulfillmentStatus} madeToOrder={order.madeToOrder} />
      </div>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium text-stone-500">Entrega</h2>
        {address ? (
          <p className="mt-2 text-sm text-stone-700">
            {address.recipient && <>{address.recipient}<br /></>}
            {address.street}, {address.number}
            {address.complement && ` — ${address.complement}`}
            <br />
            {address.neighborhood} — {address.city}/{address.state}
            <br />
            CEP {address.cep}
          </p>
        ) : (
          <p className="mt-2 text-sm text-stone-400">Endereço não informado.</p>
        )}
        {order.trackingCode && (
          <p className="mt-3 text-sm text-stone-700">
            <span className="text-stone-500">Rastreio:</span> {order.trackingCode}
          </p>
        )}
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium text-stone-500">Pagamento</h2>
        <dl className="mt-2 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-stone-500">Status</dt>
            <dd className="font-medium">{PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}</dd>
          </div>
          {payment && (
            <div>
              <dt className="text-stone-500">Forma</dt>
              <dd className="font-medium">{PAYMENT_KIND_LABEL[payment.kind] ?? payment.kind}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium text-stone-500">Itens</h2>
        <ul className="mt-2 divide-y divide-stone-100">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-center justify-between py-2 text-sm">
              <span>
                {item.qty}× {item.product.name}
              </span>
              <span className="tabular-nums">{formatBRL(item.unitPriceCents * item.qty)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-stone-100 pt-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Subtotal</dt>
            <dd className="tabular-nums">{formatBRL(order.subtotalCents)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-stone-500">Frete</dt>
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
