// app/admin/pedidos/[id]/download-label-button.tsx
"use client";

import { useState } from "react";
import { getShippingLabelUrlAction } from "@/app/admin/actions/orders";

export function DownloadLabelButton({ orderId }: { orderId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setError(null);
    setLoading(true);
    const res = await getShippingLabelUrlAction(orderId);
    setLoading(false);
    if (res.ok) {
      window.open(res.url, "_blank", "noopener,noreferrer");
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mt-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="text-sm text-neutral-900 underline underline-offset-2 disabled:opacity-50"
      >
        {loading ? "Abrindo…" : "Baixar etiqueta"}
      </button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
