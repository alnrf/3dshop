// app/admin/configuracoes/frete/flat-shipping-form.tsx
"use client";

import { useState } from "react";
import { saveFlatShippingAction } from "@/app/admin/actions/settings";
import { inputClass, labelClass, fieldsetClass, legendClass } from "../shared";
import { DEFAULT_FLAT_SHIPPING_CENTS } from "@/lib/checkout";

export function FlatShippingForm({
  flatShippingCents,
  freeShippingThresholdCents,
}: {
  flatShippingCents: number | null;
  freeShippingThresholdCents: number | null;
}) {
  const [flat, setFlat] = useState(flatShippingCents != null ? (flatShippingCents / 100).toFixed(2) : "");
  const [threshold, setThreshold] = useState(
    freeShippingThresholdCents != null ? (freeShippingThresholdCents / 100).toFixed(2) : "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await saveFlatShippingAction({
      flatShippingCents: flat ? Math.round(parseFloat(flat) * 100) : undefined,
      freeShippingThresholdCents: threshold ? Math.round(parseFloat(threshold) * 100) : undefined,
    });
    setSaving(false);
    if (res.ok) setSaved(true);
    else setError(res.error);
  }

  return (
    <fieldset className={fieldsetClass}>
      <legend className={legendClass}>Frete fixo (usado no checkout)</legend>
      <p className="text-xs text-neutral-500">
        Sem cotação real de transportadora ainda — o checkout cobra este valor fixo. Se deixar em branco, usa um
        padrão de {(DEFAULT_FLAT_SHIPPING_CENTS / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.
      </p>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Valor do frete (R$)</label>
          <input
            className={inputClass}
            inputMode="decimal"
            value={flat}
            onChange={(e) => setFlat(e.target.value)}
            placeholder="15,00"
          />
        </div>
        <div>
          <label className={labelClass}>Frete grátis acima de (R$)</label>
          <input
            className={inputClass}
            inputMode="decimal"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="opcional"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {saved && !error && <p className="text-sm text-green-700">Frete salvo.</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="h-10 rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {saving ? "Salvando…" : "Salvar frete"}
      </button>
    </fieldset>
  );
}
