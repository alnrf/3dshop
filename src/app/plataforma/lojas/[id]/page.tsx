// app/plataforma/lojas/[id]/page.tsx — detalhes de uma loja para o dono da
// plataforma: dados cadastrais, produtos e status real da assinatura (Stripe).
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requirePlatformAdmin } from "@/lib/tenant";
import { productLimitForPlan, ACTIVE_SUBSCRIPTION_STATUSES } from "@/lib/plans";
import { OwnerDetails } from "./owner-details";
import { PlanSelector } from "./plan-selector";
import { DangerZone } from "./danger-zone";

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

// Espelha os status de assinatura do Stripe (Store.subscriptionStatus, escrito
// pelo webhook em app/api/webhooks/stripe/route.ts).
const SUBSCRIPTION_STATUS_LABEL: Record<string, string> = {
  active: "Ativa",
  trialing: "Em teste",
  past_due: "Pagamento atrasado",
  unpaid: "Pagamento não realizado",
  canceled: "Cancelada",
  incomplete: "Incompleta",
  incomplete_expired: "Expirada sem confirmação",
};
const row = "flex justify-between gap-4 border-b border-neutral-100 py-3 text-sm";
const dt = "text-neutral-500";
const dd = "font-medium text-neutral-900";

export default async function StoreDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  // Guarda própria — ver comentário equivalente em ../page.tsx. Aqui o risco é
  // maior ainda: esta página mostra CNPJ e telefone do dono, não só e-mail.
  await requirePlatformAdmin();

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
  const orderCount = await prisma.order.count({ where: { storeId: store.id } });

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
            <dd className={dd}>
              {store.plan !== "pro" ? (
                <span className="text-neutral-400">—</span>
              ) : store.stripeSubscriptionId ? (
                <span
                  className={
                    ACTIVE_SUBSCRIPTION_STATUSES.has(store.subscriptionStatus ?? "")
                      ? "text-green-700"
                      : "text-amber-700"
                  }
                >
                  {SUBSCRIPTION_STATUS_LABEL[store.subscriptionStatus ?? ""] ??
                    store.subscriptionStatus ??
                    "Status desconhecido"}
                </span>
              ) : (
                <span className="text-neutral-500">Pro definido manualmente (sem assinatura no Stripe)</span>
              )}
            </dd>
          </div>
        </dl>
      </section>

      <DangerZone storeId={store.id} status={store.status} orderCount={orderCount} />
    </main>
  );
}
