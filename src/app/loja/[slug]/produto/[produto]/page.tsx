// app/loja/[slug]/produto/[produto]/page.tsx
// Obs.: o segmento do produto se chama [produto] (não [slug]) para não conflitar
// com o [slug] da loja no mesmo caminho.
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { getCartWithItems } from "@/lib/cart";
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

  const session = await auth();
  // Carrinho junto na mesma passada: sabendo a quantidade já no carrinho, a
  // página troca "Adicionar" por "Remover"/ajuste de quantidade ao vivo.
  const result = await withStore(async () => {
    const [product, customer] = await Promise.all([
      prisma.product.findUnique({
        where: { storeId_slug: { storeId: store.id, slug: produto } },
        include: { images: { orderBy: { position: "asc" } } },
      }),
      currentCustomer(session?.user?.email),
    ]);
    if (!product) return null;

    const cart = await getCartWithItems(customer?.id ?? null);
    const cartQty = cart.items.find((i) => i.productId === product.id)?.qty ?? 0;
    return { product, cartQty };
  });
  if (!result || !result.product.active) notFound();
  const { product, cartQty } = result;

  return (
    <ProductDetail
      base={`/loja/${store.slug}`}
      id={product.id}
      name={product.name}
      description={product.description}
      priceCents={product.priceCents}
      stock={product.stock}
      material={product.material}
      printTime={product.printTime}
      weightGrams={product.weightGrams}
      widthCm={product.widthCm}
      heightCm={product.heightCm}
      lengthCm={product.lengthCm}
      tags={product.tags}
      images={product.images.map((i) => r2Url(i.r2Key))}
      cartQty={cartQty}
    />
  );
}
