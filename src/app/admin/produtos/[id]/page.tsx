import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { ProductForm } from "../product-form";

export default async function EditarProduto({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storeId = await getActiveStoreId();
  const product = await runWithStore(storeId, () =>
    prisma.product.findUnique({ where: { id }, include: { images: true } }),
  );
  if (!product) notFound(); // inclui o caso "produto de outra loja" (extensão devolve null)
  return <ProductForm product={product} />;
}
