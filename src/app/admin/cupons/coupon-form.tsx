// app/admin/cupons/coupon-form.tsx
"use client";

import { useState } from "react";
import { createCouponAction, updateCouponAction, type CouponInput } from "@/app/admin/actions/coupons";

type ExistingCoupon = {
  id: string;
  code: string;
  type: "percentage" | "fixed" | "free_shipping";
  percentOff: number | null;
  valueCents: number | null;
  active: boolean;
  startsAt: Date | null;
  expiresAt: Date | null;
  maxUses: number | null;
  minOrderCents: number | null;
};

const input =
  "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const label = "block text-sm font-medium text-neutral-700";

function toDateInputValue(d: Date | null): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

export function CouponForm({ coupon }: { coupon?: ExistingCoupon }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    code: coupon?.code ?? "",
    type: coupon?.type ?? ("percentage" as CouponInput["type"]),
    percentOff: String(coupon?.percentOff ?? ""),
    value: coupon ? ((coupon.valueCents ?? 0) / 100).toFixed(2) : "",
    active: coupon?.active ?? true,
    startsAt: toDateInputValue(coupon?.startsAt ?? null),
    expiresAt: toDateInputValue(coupon?.expiresAt ?? null),
    maxUses: String(coupon?.maxUses ?? ""),
    minOrder: coupon ? ((coupon.minOrderCents ?? 0) / 100).toFixed(2) : "",
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function setDigitsOnly<K extends keyof typeof form>(key: K, raw: string) {
    set(key, raw.replace(/\D/g, "") as (typeof form)[K]);
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const payload: CouponInput = {
      code: form.code,
      type: form.type,
      percentOff: form.type === "percentage" && form.percentOff ? Number(form.percentOff) : undefined,
      valueCents: form.type === "fixed" && form.value ? Math.round(parseFloat(form.value) * 100) : undefined,
      active: form.active,
      startsAt: form.startsAt ? new Date(`${form.startsAt}T00:00:00`) : undefined,
      expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`) : undefined,
      maxUses: form.maxUses ? Number(form.maxUses) : undefined,
      minOrderCents: form.minOrder ? Math.round(parseFloat(form.minOrder) * 100) : undefined,
    };
    const res = coupon
      ? await updateCouponAction(coupon.id, payload)
      : await createCouponAction(payload);
    setSaving(false);
    // Navegação dura, mesmo padrão de product-form.tsx (router.push já travou nesse tipo de fluxo antes).
    if (res.ok) window.location.href = "/admin/cupons";
    else setError(res.error);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-medium">{coupon ? "Editar cupom" : "Novo cupom"}</h1>

      <div className="mt-6 space-y-5">
        <div>
          <label className={label}>Código</label>
          <input
            className={input}
            value={form.code}
            onChange={(e) => set("code", e.target.value.toUpperCase())}
            placeholder="BEMVINDO10"
          />
        </div>

        <div>
          <label className={label}>Tipo de desconto</label>
          <select
            className={input}
            value={form.type}
            onChange={(e) => set("type", e.target.value as CouponInput["type"])}
          >
            <option value="percentage">Percentual sobre o total</option>
            <option value="fixed">Valor fixo</option>
            <option value="free_shipping">Frete grátis</option>
          </select>
        </div>

        {form.type === "percentage" && (
          <div>
            <label className={label}>Percentual de desconto (%)</label>
            <input
              className={input}
              inputMode="numeric"
              value={form.percentOff}
              onChange={(e) => setDigitsOnly("percentOff", e.target.value)}
              placeholder="10"
            />
          </div>
        )}

        {form.type === "fixed" && (
          <div>
            <label className={label}>Valor do desconto (R$)</label>
            <input
              className={input}
              inputMode="decimal"
              value={form.value}
              onChange={(e) => set("value", e.target.value)}
              placeholder="20,00"
            />
          </div>
        )}

        <fieldset className="rounded-lg border border-neutral-200 p-4">
          <legend className="px-1 text-sm font-medium text-neutral-700">Restrições (opcional)</legend>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Válido a partir de</label>
              <input type="date" className={input} value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />
            </div>
            <div>
              <label className={label}>Válido até</label>
              <input type="date" className={input} value={form.expiresAt} onChange={(e) => set("expiresAt", e.target.value)} />
            </div>
            <div>
              <label className={label}>Limite de usos</label>
              <input
                className={input}
                inputMode="numeric"
                value={form.maxUses}
                onChange={(e) => setDigitsOnly("maxUses", e.target.value)}
                placeholder="sem limite"
              />
            </div>
            <div>
              <label className={label}>Pedido mínimo (R$)</label>
              <input
                className={input}
                inputMode="decimal"
                value={form.minOrder}
                onChange={(e) => set("minOrder", e.target.value)}
                placeholder="sem mínimo"
              />
            </div>
          </div>
        </fieldset>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Cupom ativo
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving}
            className="h-10 rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {saving ? "Salvando…" : "Salvar cupom"}
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/admin/cupons")}
            className="h-10 rounded-lg border border-neutral-300 px-5 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </main>
  );
}
