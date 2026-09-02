// app/admin/plano/page.tsx
import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { productLimitForPlan } from "@/lib/plans";
import { isStripeConfigured } from "@/lib/stripe";
import { PlanActions } from "./plan-actions";

export default async function PlanoPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const storeId = await getActiveStoreId(); // acesso já barrado no layout
  const { checkout } = await searchParams;

  const [store, productCount] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId } }),
    prisma.product.count({ where: { storeId } }),
  ]);
  if (!store) return null;

  const limit = productLimitForPlan(store.plan);

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="text-2xl font-medium">Plano</h1>

      {checkout === "sucesso" && (
        <p className="mt-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">
          Assinatura em processamento. Assim que o pagamento for confirmado, o plano muda para Pro automaticamente.
        </p>
      )}
      {checkout === "cancelado" && (
        <p className="mt-4 rounded-lg bg-neutral-50 p-3 text-sm text-neutral-600">Assinatura não concluída.</p>
      )}

      <div className="mt-6 rounded-lg border border-neutral-200 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-500">Plano atual</span>
          <span
            className={
              store.plan === "pro"
                ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
            }
          >
            {store.plan}
          </span>
        </div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm text-neutral-500">Produtos cadastrados</span>
          <span className="text-sm font-medium text-neutral-900">
            {limit !== null ? `${productCount} / ${limit}` : `${productCount} (ilimitado)`}
          </span>
        </div>
        {store.subscriptionStatus && store.plan !== "pro" && (
          <p className="mt-2 text-xs text-neutral-400">Status da última assinatura: {store.subscriptionStatus}</p>
        )}
      </div>

      <div className="mt-6 space-y-3 text-sm text-neutral-600">
        <p>
          <strong className="text-neutral-900">Free:</strong> até {limit ?? 10} produtos cadastrados. Ao ultrapassar,
          exclua um produto antigo para abrir espaço.
        </p>
        <p>
          <strong className="text-neutral-900">Pro:</strong> produtos ilimitados. Cancelar a assinatura volta
          automaticamente para o Free — os 10 produtos ativos mais antigos continuam disponíveis; os demais são
          desativados (não excluídos).
        </p>
      </div>

      <div className="mt-6">
        <PlanActions plan={store.plan} stripeConfigured={isStripeConfigured()} />
      </div>
    </main>
  );
}
