// app/loja/[slug]/carrinho/page.tsx
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { currentStore, withStore } from "@/lib/tenant";
import { getCartWithItems } from "@/lib/cart";
import { currentCustomer } from "@/lib/customer";
import { formatBRL } from "@/lib/format";
import { r2Url } from "@/lib/r2";
import { CartItemControls } from "./cart-item-controls";

export default async function CarrinhoPage() {
  const store = await currentStore();
  if (!store) notFound();
  const base = `/loja/${store.slug}`;

  const session = await auth();
  const cart = await withStore(async () => {
    const customer = await currentCustomer(session?.user?.email);
    return getCartWithItems(customer?.id ?? null);
  });
  const items = cart?.items ?? [];
  const totalCents = cart?.totalCents ?? 0;

  if (items.length === 0) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-xl font-medium">Seu carrinho está vazio</h1>
        <p className="mt-2 text-sm text-neutral-500">
          Que tal dar uma olhada nas peças disponíveis?
        </p>
        <Link
          href={base}
          className="mt-6 inline-flex h-12 items-center justify-center rounded-lg bg-neutral-900 px-6 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          Explorar produtos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:py-10">
      <h1 className="text-xl font-medium md:text-2xl">Carrinho</h1>

      <div className="mt-6 md:grid md:grid-cols-[1fr_320px] md:gap-8">
        <ul className="divide-y divide-neutral-200">
          {items.map((item) => (
            <li key={item.id} className="flex gap-4 py-4">
              <Image
                src={r2Url(item.product.images[0]?.r2Key)}
                alt={item.product.name}
                width={80}
                height={80}
                className="size-20 shrink-0 rounded-lg bg-neutral-100 object-cover"
              />
              <div className="flex min-w-0 flex-1 flex-col">
                <Link
                  href={`${base}/produto/${item.product.slug}`}
                  className="text-sm font-medium leading-snug"
                >
                  {item.product.name}
                </Link>
                <span className="mt-0.5 text-sm text-neutral-500">
                  {formatBRL(item.product.priceCents)}
                </span>
                <div className="mt-auto pt-3">
                  <CartItemControls
                    productId={item.product.id}
                    qty={item.qty}
                    maxStock={item.product.stock}
                    unitPriceCents={item.product.priceCents}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>

        <aside className="mt-6 md:mt-0">
          <div className="rounded-xl border border-neutral-200 p-4 md:sticky md:top-20">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Subtotal</span>
              <span className="font-medium tabular-nums">{formatBRL(totalCents)}</span>
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-neutral-500">Frete</span>
              <span className="text-neutral-500">calculado no checkout</span>
            </div>
            <Link
              href={`${base}/checkout`}
              className="mt-4 flex h-12 items-center justify-center rounded-lg bg-neutral-900 text-sm font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              Finalizar compra
            </Link>
          </div>
        </aside>
      </div>
    </main>
  );
}
