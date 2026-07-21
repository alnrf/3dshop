// app/carrinho/cart-item-controls.tsx
"use client";

import { useState, useTransition } from "react";
import { updateItemQtyAction, removeItemAction } from "@/app/actions/cart";
import { formatBRL } from "@/lib/format";

export function CartItemControls({
  productId,
  qty,
  maxStock,
  unitPriceCents,
}: {
  productId: string;
  qty: number;
  maxStock: number;
  unitPriceCents: number;
}) {
  // qty otimista: a UI responde na hora; reverte se a action falhar.
  const [optimisticQty, setOptimisticQty] = useState(qty);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(next: number) {
    if (next < 1 || next > maxStock) return;
    const prev = optimisticQty;
    setOptimisticQty(next);
    setError(null);
    startTransition(async () => {
      const res = await updateItemQtyAction(productId, next);
      if (!res.ok) {
        setOptimisticQty(prev); // reverte
        setError(res.error);
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removeItemAction(productId);
      if (!res.ok) setError(res.error);
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="inline-flex items-center rounded-lg border border-neutral-300">
        <button
          type="button"
          onClick={() => change(optimisticQty - 1)}
          disabled={pending || optimisticQty <= 1}
          aria-label="Diminuir quantidade"
          className="flex h-11 w-11 items-center justify-center text-lg disabled:opacity-40"
        >
          −
        </button>
        <span
          aria-live="polite"
          className="w-8 text-center text-sm tabular-nums"
        >
          {optimisticQty}
        </span>
        <button
          type="button"
          onClick={() => change(optimisticQty + 1)}
          disabled={pending || optimisticQty >= maxStock}
          aria-label="Aumentar quantidade"
          className="flex h-11 w-11 items-center justify-center text-lg disabled:opacity-40"
        >
          +
        </button>
      </div>

      <span className="text-sm font-medium tabular-nums">
        {formatBRL(unitPriceCents * optimisticQty)}
      </span>

      <button
        type="button"
        onClick={remove}
        disabled={pending}
        className="text-sm text-neutral-500 underline-offset-2 hover:underline disabled:opacity-40"
      >
        Remover
      </button>

      {error && (
        <p role="alert" className="w-full text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
