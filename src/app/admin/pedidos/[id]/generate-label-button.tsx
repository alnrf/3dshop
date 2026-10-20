// app/admin/pedidos/[id]/generate-label-button.tsx
"use client";

import { useState } from "react";
import { generateShippingLabelAction } from "@/app/admin/actions/orders";

export function GenerateLabelButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (!window.confirm("Gerar etiqueta de verdade na SuperFrete? Isso usa o saldo da carteira da loja.")) return;
    setError(null);
    setLoading(true);
    const res = await generateShippingLabelAction(orderId);
    setLoading(false);
    if (!res.ok) setError(res.error);
    // Sucesso: revalidatePath já atualiza a página, mostrando o link de download.
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="h-9 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {loading ? "Gerando…" : "Gerar etiqueta"}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
