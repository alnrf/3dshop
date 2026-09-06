// components/cart-quantity-control.tsx — estepper "- N +" + lixeira usado sempre
// que um produto JÁ ESTÁ no carrinho: grid da vitrine, página de detalhe e
// página do carrinho. Uma lógica só, pra não divergir entre as três telas.
// Disponibilidade final é validada no checkout — aqui só limita pelo estoque
// cadastrado (Product.stock).
"use client";

import { useState, useTransition } from "react";
import { updateItemQtyAction, removeItemAction } from "@/app/actions/cart";

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="18"
      height="18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m3 0-.8 12.1a2 2 0 0 1-2 1.9H8.8a2 2 0 0 1-2-1.9L6 7" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function CartQuantityControl({
  productId,
  stock,
  qty,
  onQtyChange,
  onRemoved,
}: {
  productId: string;
  stock: number;
  qty: number;
  onQtyChange: (qty: number) => void;
  onRemoved: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function change(next: number) {
    if (next < 1 || next > stock) return;
    const prev = qty;
    onQtyChange(next); // otimista: UI responde na hora, reverte se a action falhar
    setError(null);
    startTransition(async () => {
      const res = await updateItemQtyAction(productId, next);
      if (!res.ok) {
        onQtyChange(prev);
        setError(res.error);
      }
    });
  }

  function remove() {
    setError(null);
    startTransition(async () => {
      const res = await removeItemAction(productId);
      if (res.ok) onRemoved();
      else setError(res.error);
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="inline-flex h-10 items-center rounded-lg border border-neutral-300">
          <button
            type="button"
            onClick={() => change(qty - 1)}
            disabled={pending || qty <= 1}
            aria-label="Diminuir quantidade"
            className="flex h-full w-9 items-center justify-center text-base disabled:opacity-40"
          >
            −
          </button>
          <span aria-live="polite" className="w-7 text-center text-sm tabular-nums">
            {qty}
          </span>
          <button
            type="button"
            onClick={() => change(qty + 1)}
            disabled={pending || qty >= stock}
            aria-label="Aumentar quantidade"
            className="flex h-full w-9 items-center justify-center text-base disabled:opacity-40"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={pending}
          aria-label="Remover do carrinho"
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-neutral-300 text-neutral-500 hover:border-red-300 hover:text-red-600 disabled:opacity-40"
        >
          <TrashIcon />
        </button>
      </div>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
