// app/loja/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withStore } from "@/lib/tenant";
import { r2Url } from "@/lib/r2";
import { ProductCard } from "./product-card";

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  // withStore resolve o tenant e roda a query no contexto (extensão aplica storeId).
  const products = await withStore(async () =>
    prisma.product.findMany({
      where: {
        active: true,
        ...(query
          ? { OR: [{ name: { contains: query, mode: "insensitive" } }, { tags: { has: query.toLowerCase() } }] }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      include: { images: { orderBy: { position: "asc" }, take: 1 } },
    }),
  );
  if (!products) notFound();

  const items = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    stock: p.stock,
    imageUrl: r2Url(p.images[0]?.r2Key),
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <form className="flex gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar produtos…"
          className="h-11 w-full rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        />
        <button
          type="submit"
          className="h-11 shrink-0 rounded-lg border border-stone-300 bg-white px-4 text-sm font-medium hover:bg-stone-100"
        >
          Buscar
        </button>
      </form>

      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-stone-500">
          {query ? `Nenhum produto encontrado para "${query}".` : "Nenhum produto disponível ainda."}
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      )}
    </main>
  );
}
