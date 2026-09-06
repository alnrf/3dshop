// app/loja/[slug]/product-card.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCartAction } from "@/app/actions/cart";
import { formatBRL } from "@/lib/format";
import { CartQuantityControl } from "@/components/cart-quantity-control";

export function ProductCard({
  id,
  slug,
  name,
  priceCents,
  stock,
  imageUrl,
  cartQty,
  base,
}: {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
  cartQty: number;
  base: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Otimista: reflete a ação local sem esperar o revalidate da listagem.
  const [cartQtyState, setCartQtyState] = useState(cartQty);
  const soldOut = stock <= 0;
  const href = `${base}/produto/${slug}`;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction(id, 1);
      if (res.ok) setCartQtyState(1);
      else setError(res.error);
    });
  }

  return (
    <div className="flex flex-col">
      <Link href={href} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
        <Image
          src={imageUrl}
          alt={name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover"
        />
        {soldOut && (
          <span className="absolute left-2 top-2 rounded-full bg-neutral-900/80 px-2 py-0.5 text-xs font-medium text-white">
            Esgotado
          </span>
        )}
      </Link>

      <Link href={href} className="mt-2 line-clamp-2 text-sm font-medium leading-snug hover:underline">
        {name}
      </Link>
      <span className="mt-0.5 text-sm text-neutral-600 tabular-nums">
        {formatBRL(priceCents)}
      </span>

      <div className="mt-2">
        {cartQtyState > 0 ? (
          <CartQuantityControl
            productId={id}
            stock={stock}
            qty={cartQtyState}
            onQtyChange={setCartQtyState}
            onRemoved={() => setCartQtyState(0)}
          />
        ) : (
          <button
            type="button"
            onClick={handleAdd}
            disabled={pending || soldOut}
            className="h-10 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {soldOut ? "Indisponível" : pending ? "Adicionando…" : "Adicionar"}
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
