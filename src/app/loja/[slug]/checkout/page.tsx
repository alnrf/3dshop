// app/loja/[slug]/checkout/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { currentCustomer, type CustomerAddress } from "@/lib/customer";
import { getCartWithItems } from "@/lib/cart";
import { prisma } from "@/lib/prisma";
import { r2Url } from "@/lib/r2";
import { DEFAULT_FLAT_SHIPPING_CENTS } from "@/lib/checkout";
import { CheckoutForm } from "./checkout-form";

export default async function CheckoutPage() {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;
  const next = encodeURIComponent(`${base}/checkout`);

  const session = await auth();
  if (!session?.user) redirect(`${base}/entrar?next=${next}`);

  const data = await withStore(async (storeId) => {
    const customer = await currentCustomer(session.user?.email);
    if (!customer) return null;

    const cart = await getCartWithItems(customer.id);
    const storeRow = await prisma.store.findUnique({
      where: { id: storeId },
      select: { flatShippingCents: true, freeShippingThresholdCents: true },
    });
    const address = ((customer.addresses as unknown as CustomerAddress[] | null) ?? [])[0] ?? null;

    return {
      customerName: customer.name,
      address,
      items: cart.items,
      subtotalCents: cart.totalCents,
      flatShippingCents: storeRow?.flatShippingCents ?? DEFAULT_FLAT_SHIPPING_CENTS,
      freeShippingThresholdCents: storeRow?.freeShippingThresholdCents ?? null,
    };
  });

  if (!data) redirect(`${base}/entrar?next=${next}`);
  if (data.items.length === 0) redirect(`${base}/carrinho`);

  return (
    <CheckoutForm
      base={base}
      customerName={data.customerName}
      address={data.address}
      items={data.items.map((i) => ({
        productId: i.product.id,
        name: i.product.name,
        qty: i.qty,
        unitPriceCents: i.product.priceCents,
        imageUrl: r2Url(i.product.images[0]?.r2Key),
      }))}
      subtotalCents={data.subtotalCents}
      flatShippingCents={data.flatShippingCents}
      freeShippingThresholdCents={data.freeShippingThresholdCents}
    />
  );
}
