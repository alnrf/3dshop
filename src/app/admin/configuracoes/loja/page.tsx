import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { StoreLogoForm } from "./store-logo-form";

export default async function ConfiguracoesLojaPage() {
  const storeId = await getActiveStoreId(); // acesso já barrado no layout do admin
  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { logoKey: true } });
  return <StoreLogoForm logoKey={store?.logoKey ?? null} />;
}
