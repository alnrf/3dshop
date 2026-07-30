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
        className="text-sm text-neutral-700 underline-offset-2 hover:underline disabled:opacity-50"
      >
        {saving ? "Aprovando…" : "Aprovar"}
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
