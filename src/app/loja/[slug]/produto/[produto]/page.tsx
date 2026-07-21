// app/loja/[slug]/produto/[produto]/page.tsx
// Obs.: o segmento do produto se chama [produto] (não [slug]) para não conflitar
// com o [slug] da loja no mesmo caminho.
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { currentStore, withStore } from "@/lib/tenant";
import { r2Url } from "@/lib/r2";
import { ProductDetail } from "./product-detail";

export default async function ProdutoPage({
  params,
}: {
  params: Promise<{ slug: string; produto: string }>;
}) {
  const { produto } = await params;
  const store = await currentStore();
  if (!store) notFound();

  const product = await withStore(() =>
    prisma.product.findUnique({
      where: { storeId_slug: { storeId: store.id, slug: produto } },
      include: { images: { orderBy: { position: "asc" } } },
    }),
  );
  if (!product || !product.active) notFound();

  return (
    <ProductDetail
      id={product.id}
      name={product.name}
      description={product.description}
      priceCents={product.priceCents}
      stock={product.stock}
      material={product.material}
      printTime={product.printTime}
      images={product.images.map((i) => r2Url(i.r2Key))}
    />
  );
}
