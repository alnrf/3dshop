// app/plataforma/lojas/[id]/plan-selector.tsx
"use client";

import { useState } from "react";
import { updateStorePlanAction } from "@/app/plataforma/actions/stores";

export function PlanSelector({ storeId, plan }: { storeId: string; plan: string }) {
  const [value, setValue] = useState(plan === "pro" ? "pro" : "free");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleChange(next: string) {
    setValue(next);
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await updateStorePlanAction(storeId, { plan: next as "free" | "pro" });
    setSaving(false);
    if (res.ok) setSaved(true);
    else {
      setError(res.error);
      setValue(plan); // reverte se falhou
    }
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={value}
        disabled={saving}
        onChange={(e) => handleChange(e.target.value)}
        className="h-8 rounded-lg border border-neutral-300 px-2 text-sm disabled:opacity-50"
      >
        <option value="free">free</option>
        <option value="pro">pro</option>
      </select>
      {saving && <span className="text-xs text-neutral-400">salvando…</span>}
      {saved && !saving && <span className="text-xs text-green-700">salvo</span>}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
