import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getActiveStoreId } from "@/lib/tenant";
import { runWithStore } from "@/lib/tenant-context";
import { CouponForm } from "../coupon-form";

export default async function EditarCupom({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const storeId = await getActiveStoreId();
  const coupon = await runWithStore(storeId, async () => prisma.coupon.findUnique({ where: { id } }));
  if (!coupon) notFound(); // inclui o caso "cupom de outra loja" (extensão devolve null)
  return <CouponForm coupon={coupon} />;
}
