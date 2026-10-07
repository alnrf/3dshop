// app/admin/cupons/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { formatBRL } from "@/lib/format";
import { toggleCouponActiveFormAction, deleteCouponFormAction } from "@/app/admin/actions/coupons";

const TYPE_LABEL: Record<string, string> = {
  percentage: "Percentual",
  fixed: "Valor fixo",
  free_shipping: "Frete grátis",
};

function describeDiscount(c: { type: string; percentOff: number | null; valueCents: number | null }): string {
  if (c.type === "percentage") return `${c.percentOff}%`;
  if (c.type === "fixed") return formatBRL(c.valueCents ?? 0);
  return "Frete grátis";
}

export default async function CuponsAdminPage() {
  const storeId = await getActiveStoreId(); // acesso já barrado no layout

  const coupons = await runWithStore(storeId, () =>
    prisma.coupon.findMany({ orderBy: { createdAt: "desc" } }),
  );

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Cupons</h1>
        <Link
          href="/admin/cupons/novo"
          className="inline-flex h-10 items-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Novo cupom
        </Link>
      </div>

      <p className="mt-2 text-sm text-neutral-500">
        Cadastro e gerenciamento dos cupons. A aplicação automática no carrinho/checkout chega junto com o checkout.
      </p>

      {coupons.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500">Nenhum cupom ainda. Cadastre o primeiro.</p>
      ) : (
        <table className="mt-6 w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="border-b border-neutral-200 py-2 pr-3 font-medium">Código</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Tipo</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Desconto</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Usos</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Status</th>
              <th className="border-b border-neutral-200 py-2 pl-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {coupons.map((c) => (
              <tr key={c.id} className="align-middle">
                <td className="border-b border-neutral-100 py-3 pr-3 font-medium tabular-nums">{c.code}</td>
                <td className="border-b border-neutral-100 px-3 py-3">{TYPE_LABEL[c.type]}</td>
                <td className="border-b border-neutral-100 px-3 py-3 tabular-nums">{describeDiscount(c)}</td>
                <td className="border-b border-neutral-100 px-3 py-3 tabular-nums text-neutral-500">
                  {c.usedCount}
                  {c.maxUses ? ` / ${c.maxUses}` : ""}
                </td>
                <td className="border-b border-neutral-100 px-3 py-3">
                  <span
                    className={
                      c.active
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                        : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                    }
                  >
                    {c.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="border-b border-neutral-100 py-3 pl-3">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/cupons/${c.id}`}
                      title="Editar"
                      aria-label="Editar"
                      className="flex items-center justify-center rounded p-1.5 text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={2}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-5 w-5"
                      >
                        <path d="M12 20h9" />
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4Z" />
                      </svg>
                    </Link>
                    <form action={toggleCouponActiveFormAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <input type="hidden" name="active" value={String(!c.active)} />
                      <button
                        title={c.active ? "Desativar" : "Ativar"}
                        aria-label={c.active ? "Desativar" : "Ativar"}
                        className="flex items-center justify-center rounded p-1.5 text-neutral-600 hover:bg-neutral-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                      >
                        {c.active ? (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                          >
                            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                            <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68M6.61 6.61C3.35 8.36 2 12 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                            <path d="m2 2 20 20" />
                          </svg>
                        ) : (
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="h-5 w-5"
                          >
                            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        )}
                      </button>
                    </form>
                    <form action={deleteCouponFormAction}>
                      <input type="hidden" name="id" value={c.id} />
                      <button
                        title="Excluir"
                        aria-label="Excluir"
                        className="flex items-center justify-center rounded p-1.5 text-red-600 hover:bg-red-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth={2}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="h-5 w-5"
                        >
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6Z" />
                          <path d="M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
