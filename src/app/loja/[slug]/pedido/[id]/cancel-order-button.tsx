// app/loja/[slug]/pedido/[id]/cancel-order-button.tsx
"use client";

import { useState } from "react";
import { cancelMyOrderAction } from "@/app/actions/order-cancel";

export function CancelOrderButton({ orderId, withinWindow }: { orderId: string; withinWindow: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!withinWindow) {
    return <p className="mt-4 text-xs text-stone-400">Prazo de 7 dias para cancelamento encerrado.</p>;
  }

  async function handleClick() {
    if (!window.confirm("Cancelar este pedido? Se já foi pago, o valor será estornado.")) return;
    setError(null);
    setLoading(true);
    const res = await cancelMyOrderAction(orderId);
    setLoading(false);
    if (!res.ok) setError(res.error);
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="h-9 rounded-lg border border-red-300 px-4 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
      >
        {loading ? "Cancelando…" : "Cancelar pedido"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
