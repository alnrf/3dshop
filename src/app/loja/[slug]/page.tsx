// app/loja/[slug]/page.tsx
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { getCartWithItems } from "@/lib/cart";
import { r2Url } from "@/lib/r2";
import { ProductCard } from "./product-card";

export default async function VitrinePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";
  const session = await auth();

  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;

  // withStore resolve o tenant e roda a query no contexto (extensão aplica storeId).
  // Cart junto na mesma passada: dá pra saber a quantidade já no carrinho e
  // trocar "Adicionar" por "Remover" no card.
  const result = await withStore(async () => {
    const [products, customer] = await Promise.all([
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
      currentCustomer(session?.user?.email),
    ]);
    const cart = await getCartWithItems(customer?.id ?? null);
    return { products, cartQtyById: new Map(cart.items.map((i) => [i.productId, i.qty])) };
  });
  if (!result) notFound();
  const { products, cartQtyById } = result;

  const items = products.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    priceCents: p.priceCents,
    stock: p.stock,
    imageUrl: r2Url(p.images[0]?.r2Key),
    cartQty: cartQtyById.get(p.id) ?? 0,
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
            <ProductCard key={p.id} {...p} base={base} />
          ))}
        </div>
      )}
    </main>
  );
}
