// app/admin/pedidos/[id]/cancel-order-button.tsx
"use client";

import { useState } from "react";
import { cancelOrderAction } from "@/app/admin/actions/orders";

export function CancelOrderButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm("Cancelar este pedido? Isso repõe o estoque, libera o cupom (se houver) e estorna o pagamento, se já tiver sido aprovado.")) {
      return;
    }
    setError(null);
    setLoading(true);
    const res = await cancelOrderAction(orderId);
    setLoading(false);
    if (!res.ok) setError(res.error);
    // Sucesso: revalidatePath já atualiza a página — não precisa de reload manual.
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
