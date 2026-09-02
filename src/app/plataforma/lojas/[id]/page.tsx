// app/plataforma/lojas/[id]/page.tsx — detalhes de uma loja para o dono da
// plataforma: dados cadastrais hoje; métricas de produtos/mensalidade depois.
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { productLimitForPlan } from "@/lib/plans";
import { OwnerDetails } from "./owner-details";
import { PlanSelector } from "./plan-selector";

const STATUS_LABEL: Record<string, string> = {
  active: "active",
  pending: "pending",
  rejected: "rejected",
  suspended: "suspended",
};

const STATUS_CLASS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-amber-100 text-amber-800",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-neutral-100 text-neutral-600",
};

const row = "flex justify-between gap-4 border-b border-neutral-100 py-3 text-sm";
const dt = "text-neutral-500";
const dd = "font-medium text-neutral-900";

export default async function StoreDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const store = await prisma.store.findUnique({
    where: { id },
    include: { memberships: { where: { role: "owner" }, take: 1, include: { user: true } } },
  });
  if (!store) notFound();

  const owner = store.memberships[0]?.user;
  const statusClass = STATUS_CLASS[store.status] ?? STATUS_CLASS.suspended;
  const statusLabel = STATUS_LABEL[store.status] ?? store.status;

  const productCount = await prisma.product.count({ where: { storeId: store.id } });
  const productLimit = productLimitForPlan(store.plan);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/plataforma/lojas" className="text-sm text-neutral-500 hover:underline">
        ← Lojas
      </Link>

      <div className="mt-3 flex items-center justify-between">
        <h1 className="text-2xl font-medium">{store.name}</h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusClass}`}>{statusLabel}</span>
      </div>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-neutral-500">Dados da loja</h2>
        <dl className="mt-2">
          <div className={row}>
            <dt className={dt}>Slug</dt>
            <dd className={dd}>/{store.slug}</dd>
          </div>
          <div className={row}>
            <dt className={dt}>Plano</dt>
            <dd className={dd}>
              <PlanSelector storeId={store.id} plan={store.plan} />
            </dd>
          </div>
        </dl>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-500">Dono</h2>
        <OwnerDetails storeId={store.id} owner={owner} />
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-neutral-500">Produtos &amp; mensalidade</h2>
        <dl className="mt-2">
          <div className={row}>
            <dt className={dt}>Produtos cadastrados</dt>
            <dd className={dd}>{productLimit !== null ? `${productCount} / ${productLimit}` : productCount}</dd>
          </div>
          <div className={row}>
            <dt className={dt}>Mensalidade</dt>
            <dd className="text-neutral-400">Em breve.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
