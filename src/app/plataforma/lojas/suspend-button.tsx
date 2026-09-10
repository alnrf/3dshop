// app/plataforma/lojas/suspend-button.tsx
"use client";

import { useState } from "react";
import { suspendStoreAction } from "@/app/plataforma/actions/stores";

export function SuspendButton({ storeId }: { storeId: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suspended, setSuspended] = useState(false);

  async function handleSuspend() {
    if (!window.confirm("Inativar esta loja? A vitrine e o painel do lojista ficam bloqueados até reativar.")) return;
    setError(null);
    setSaving(true);
    const res = await suspendStoreAction(storeId);
    setSaving(false);
    if (res.ok) setSuspended(true);
    else setError(res.error);
  }

  if (suspended) {
    return <p className="text-xs font-medium text-neutral-500">Loja inativada.</p>;
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSuspend}
        disabled={saving}
        title="Inativar"
        aria-label="Inativar"
        className="flex cursor-pointer items-center justify-center rounded p-1.5 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
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
          <rect x="7" y="5" width="3" height="14" rx="1" />
          <rect x="14" y="5" width="3" height="14" rx="1" />
        </svg>
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
