// app/plataforma/lojas/reject-button.tsx
"use client";

import { useState } from "react";
import { rejectStoreAction } from "@/app/plataforma/actions/stores";

export function RejectButton({ storeId }: { storeId: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rejected, setRejected] = useState(false);

  async function handleReject() {
    if (!window.confirm("Reprovar esta loja? O cadastro fica marcado como rejeitado.")) return;
    setError(null);
    setSaving(true);
    const res = await rejectStoreAction(storeId);
    setSaving(false);
    if (res.ok) setRejected(true);
    else setError(res.error);
  }

  if (rejected) {
    return <p className="text-xs font-medium text-red-700">Loja reprovada.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleReject}
        disabled={saving}
        title="Reprovar"
        aria-label="Reprovar"
        className="flex items-center justify-center rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400 focus:ring-offset-2"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5"
        >
          <circle cx="12" cy="12" r="9" />
          <path d="m9 9 6 6m0-6-6 6" />
        </svg>
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
