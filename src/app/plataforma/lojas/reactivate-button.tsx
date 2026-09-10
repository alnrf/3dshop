// app/plataforma/lojas/reactivate-button.tsx
"use client";

import { useState } from "react";
import { reactivateStoreAction } from "@/app/plataforma/actions/stores";

export function ReactivateButton({ storeId }: { storeId: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactivated, setReactivated] = useState(false);

  async function handleReactivate() {
    setError(null);
    setSaving(true);
    const res = await reactivateStoreAction(storeId);
    setSaving(false);
    if (res.ok) setReactivated(true);
    else setError(res.error);
  }

  if (reactivated) {
    return <p className="text-xs font-medium text-green-700">Loja reativada.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleReactivate}
        disabled={saving}
        title="Reativar"
        aria-label="Reativar"
        className="flex cursor-pointer items-center justify-center rounded p-1.5 text-green-600 hover:bg-green-50 disabled:cursor-not-allowed disabled:opacity-50"
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
          <polygon points="10 8 16 12 10 16 10 8" fill="currentColor" stroke="none" />
        </svg>
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
