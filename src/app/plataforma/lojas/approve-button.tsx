// app/plataforma/lojas/approve-button.tsx
"use client";

import { useState } from "react";
import { approveStoreAction } from "@/app/plataforma/actions/stores";

export function ApproveButton({ storeId }: { storeId: string }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [credentials, setCredentials] = useState<{ email: string; password: string } | null>(null);

  async function handleApprove() {
    setError(null);
    setSaving(true);
    const res = await approveStoreAction(storeId);
    setSaving(false);
    if (res.ok) setCredentials({ email: res.email, password: res.provisionalPassword });
    else setError(res.error);
  }

  if (credentials) {
    return (
      <div className="text-xs text-neutral-700">
        <p className="font-medium text-green-700">Loja aprovada.</p>
        <p>
          {credentials.email} / <span className="font-mono">{credentials.password}</span>
        </p>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleApprove}
        disabled={saving}
        title="Aprovar"
        aria-label="Aprovar"
        className="flex items-center justify-center rounded p-1.5 text-green-600 hover:bg-green-50 disabled:opacity-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-2"
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
          <path d="m8.5 12.5 2.5 2.5 5-5" />
        </svg>
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
