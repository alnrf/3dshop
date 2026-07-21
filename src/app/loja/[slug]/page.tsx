// app/loja/[slug]/page.tsx
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { withStore } from "@/lib/tenant";
import { r2Url } from "@/lib/r2";
import { ProductCard } from "./product-card";

export default async function VitrinePage() {
  // withStore resolve o tenant e roda a query no contexto (extensão aplica storeId).
  const products = await withStore(() =>
    prisma.product.findMany({
      where: { active: true },
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
      {items.length === 0 ? (
        <p className="py-16 text-center text-sm text-neutral-500">
          Nenhum produto disponível ainda.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {items.map((p) => (
            <ProductCard key={p.id} {...p} />
          ))}
        </div>
      )}
    </main>
  );
}
