// app/loja/[slug]/carrinho/cart-item-controls.tsx
"use client";

import { useState } from "react";
import { formatBRL } from "@/lib/format";
import { CartQuantityControl } from "@/components/cart-quantity-control";

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
  const [qtyState, setQtyState] = useState(qty);
  const [removed, setRemoved] = useState(false);

  // Otimista: some da lista na hora; o revalidate do server confirma depois.
  if (removed) return null;

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <CartQuantityControl
        productId={productId}
        stock={maxStock}
        qty={qtyState}
        onQtyChange={setQtyState}
        onRemoved={() => setRemoved(true)}
      />
      <span className="text-sm font-medium tabular-nums">{formatBRL(unitPriceCents * qtyState)}</span>
    </div>
  );
}
