// app/admin/produtos/page.tsx
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { r2Url } from "@/lib/r2";
import { formatBRL } from "@/lib/format";
import {
  toggleActiveFormAction,
  deleteProductFormAction,
} from "@/app/admin/actions/products";

export default async function ProdutosAdminPage() {
  const storeId = await getActiveStoreId(); // acesso já barrado no layout
  const products = await runWithStore(storeId, () =>
    prisma.product.findMany({
      orderBy: { createdAt: "desc" }, // extensão injeta o storeId
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
  );

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-medium">Produtos</h1>
        <Link
          href="/admin/produtos/novo"
          className="inline-flex h-10 items-center rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Novo produto
        </Link>
      </div>

      {products.length === 0 ? (
        <p className="mt-12 text-center text-sm text-neutral-500">
          Nenhum produto ainda. Cadastre o primeiro para abrir a loja.
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
                  <div className="flex items-center gap-3">
                    <Link
                      href={`/admin/produtos/${p.id}`}
                      className="text-neutral-700 underline-offset-2 hover:underline"
                    >
                      Editar
                    </Link>
                    <form action={toggleActiveFormAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="active" value={String(!p.active)} />
                      <button className="text-neutral-700 underline-offset-2 hover:underline">
                        {p.active ? "Desativar" : "Ativar"}
                      </button>
                    </form>
                    <form action={deleteProductFormAction}>
                      <input type="hidden" name="id" value={p.id} />
                      <button className="text-red-600 underline-offset-2 hover:underline">
                        Excluir
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
