// app/loja/[slug]/perfil/page.tsx
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { auth, signOut } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer, type CustomerAddress } from "@/lib/customer";
import { prisma } from "@/lib/prisma";
import { formatBRL } from "@/lib/format";
import { ProfileForm } from "./profile-form";

const FULFILLMENT_LABEL: Record<string, string> = {
  awaiting_payment: "Aguardando pagamento",
  paid: "Pago",
  printing: "Em impressão",
  shipped: "Enviado",
  delivered: "Entregue",
  canceled: "Cancelado",
};

export default async function PerfilPage() {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;

  const session = await auth();
  if (!session?.user) redirect(`${base}/entrar`);

  const data = await withStore(async () => {
    const customer = await currentCustomer(session.user?.email);
    if (!customer) return null;
    const orders = await prisma.order.findMany({
      where: { customerId: customer.id },
      orderBy: { createdAt: "desc" },
      include: { items: true },
    });
    return { customer, orders };
  });
  if (!data) redirect(`${base}/entrar`);
  const { customer, orders } = data;

  async function handleSignOut() {
    "use server";
    await signOut({ redirectTo: base });
  }

  const addresses = customer.addresses as CustomerAddress[] | null;
  const address = addresses?.[0] ?? null;

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-xl font-medium">Minha conta</h1>
      <p className="mt-1 text-sm text-stone-500">{customer.email}</p>

      <div className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <ProfileForm name={customer.name} phone={customer.phone} cpf={customer.cpf} address={address} />
      </div>

      <form action={handleSignOut} className="mt-4">
        <button className="text-sm text-stone-600 underline-offset-2 hover:underline">Sair</button>
      </form>

      <h2 className="mt-10 text-lg font-medium">Meus pedidos</h2>
      {orders.length === 0 ? (
        <p className="mt-4 text-sm text-stone-500">Nenhum pedido ainda.</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((order) => (
            <li key={order.id}>
              <Link
                href={`${base}/pedido/${order.id}`}
                className="block rounded-lg border border-stone-200 bg-white p-4 text-sm hover:border-stone-300"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">Pedido #{order.id.slice(-6)}</span>
                  <span className="text-stone-500">
                    {order.createdAt.toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="mt-1 text-stone-600">
                  {order.items.reduce((n, i) => n + i.qty, 0)} item(ns) ·{" "}
                  {FULFILLMENT_LABEL[order.fulfillmentStatus] ?? order.fulfillmentStatus}
                </p>
                <p className="mt-1 font-medium tabular-nums">{formatBRL(order.totalCents)}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
