// app/loja/[slug]/product-card.tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { addToCartAction } from "@/app/actions/cart";
import { formatBRL } from "@/lib/format";

export function ProductCard({
  id,
  name,
  priceCents,
  stock,
  imageUrl,
}: {
  id: string;
  slug: string;
  name: string;
  priceCents: number;
  stock: number;
  imageUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const soldOut = stock <= 0;

  function handleAdd() {
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction(id, 1);
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <div className="flex flex-col">
      <div className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
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
      </div>

      <h3 className="mt-2 line-clamp-2 text-sm font-medium leading-snug">{name}</h3>
      <span className="mt-0.5 text-sm text-neutral-600 tabular-nums">
        {formatBRL(priceCents)}
      </span>

      <button
        type="button"
        onClick={handleAdd}
        disabled={pending || soldOut}
        className="mt-2 h-10 rounded-lg bg-neutral-900 text-sm font-medium text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {soldOut ? "Indisponível" : added ? "Adicionado ✓" : pending ? "Adicionando…" : "Adicionar"}
      </button>

      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
