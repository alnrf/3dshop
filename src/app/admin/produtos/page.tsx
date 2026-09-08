// app/admin/produtos/page.tsx
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { r2Url } from "@/lib/r2";
import { formatBRL } from "@/lib/format";
import { productLimitForPlan } from "@/lib/plans";
import {
  toggleActiveFormAction,
  deleteProductFormAction,
} from "@/app/admin/actions/products";

export default async function ProdutosAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const storeId = await getActiveStoreId(); // acesso já barrado no layout
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { plan: true } });
  const [products, totalCount] = await runWithStore(storeId, async () => [
    await prisma.product.findMany({
      // extensão injeta o storeId
      where: query
        ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { tags: { has: query.toLowerCase() } }] }
        : undefined,
      orderBy: { createdAt: "desc" },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
    await prisma.product.count(),
  ]);

  const limit = productLimitForPlan(store?.plan ?? "free");
  const atLimit = limit !== null && totalCount >= limit;

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-medium">Produtos</h1>
          {limit !== null && (
            <p className={`mt-1 text-sm ${atLimit ? "text-amber-700" : "text-neutral-500"}`}>
              {totalCount} / {limit} produtos do plano gratuito
              {atLimit && " — exclua um produto antigo ou assine o plano Pro para cadastrar mais"}
            </p>
          )}
        </div>
        <Link
          href="/admin/produtos/novo"
          className="inline-flex h-10 items-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Novo produto
        </Link>
      </div>

      <form className="mt-4 flex gap-2" action="/admin/produtos">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por nome ou tag…"
          className="h-10 w-full max-w-sm rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <button
          type="submit"
          className="h-10 rounded-lg border border-neutral-300 px-4 text-sm font-medium hover:bg-neutral-50"
        >
          Buscar
        </button>
        {query && (
          <Link
            href="/admin/produtos"
            className="flex h-10 items-center text-sm text-neutral-500 underline-offset-2 hover:underline"
          >
            Limpar
          </Link>
        )}
      </form>

      {products.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500">
          {query ? `Nenhum produto encontrado para "${query}".` : "Nenhum produto ainda. Cadastre o primeiro para abrir a loja."}
        </p>
      ) : (
        <table className="mt-6 w-full border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="text-left text-neutral-500">
              <th className="border-b border-neutral-200 py-2 pr-3 font-medium">Produto</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Preço</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Estoque</th>
              <th className="border-b border-neutral-200 px-3 py-2 font-medium">Status</th>
              <th className="border-b border-neutral-200 py-2 pl-3 font-medium">Ações</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id} className="align-middle">
                <td className="border-b border-neutral-100 py-3 pr-3">
                  <div className="flex items-center gap-3">
                    <Image
                      src={r2Url(p.images[0]?.r2Key)}
                      alt=""
                      width={40}
                      height={40}
                      className="size-10 rounded-md bg-neutral-100 object-cover"
                    />
                    <span className="font-medium">{p.name}</span>
                  </div>
                </td>
                <td className="border-b border-neutral-100 px-3 py-3 tabular-nums">
                  {formatBRL(p.priceCents)}
                </td>
                <td className="border-b border-neutral-100 px-3 py-3 tabular-nums">
                  {p.stock}
                </td>
                <td className="border-b border-neutral-100 px-3 py-3">
                  <span
                    className={
                      p.active
                        ? "rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800"
                        : "rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600"
                    }
                  >
                    {p.active ? "Ativo" : "Inativo"}
                  </span>
                </td>
                <td className="border-b border-neutral-100 py-3 pl-3">
                  <div className="flex items-center gap-1">
                    <Link
                      href={`/admin/produtos/${p.id}`}
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
                    <form action={toggleActiveFormAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={String(!p.active)} />
                      <button
                        title={p.active ? "Desativar" : "Ativar"}
                        aria-label={p.active ? "Desativar" : "Ativar"}
                        className="flex items-center justify-center rounded p-1.5 text-neutral-600 hover:bg-neutral-100 cursor-pointer focus:outline-none focus:ring-2 focus:ring-neutral-400 focus:ring-offset-2"
                      >
                        {p.active ? (
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
                    <form action={deleteProductFormAction}>
                      <input type="hidden" name="id" value={p.id} />
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
