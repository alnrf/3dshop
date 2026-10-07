// app/loja/[slug]/checkout/checkout-form.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { createOrderAction, previewCouponAction } from "@/app/actions/checkout";
import { maskCep, formatBRL } from "@/lib/format";
import type { CustomerAddress } from "@/lib/customer";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const input =
  "mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const label = "block text-sm font-medium text-stone-700";

type Item = { productId: string; name: string; qty: number; unitPriceCents: number; imageUrl: string };
type AppliedCoupon = { code: string; discountCents: number; freeShipping: boolean };

export function CheckoutForm({
  base,
  customerName,
  address,
  items,
  subtotalCents,
  flatShippingCents,
  freeShippingThresholdCents,
}: {
  base: string;
  customerName: string;
  address: CustomerAddress | null;
  items: Item[];
  subtotalCents: number;
  flatShippingCents: number;
  freeShippingThresholdCents: number | null;
}) {
  const [form, setForm] = useState({
    cep: address?.cep ? maskCep(address.cep) : "",
    street: address?.street ?? "",
    number: address?.number ?? "",
    complement: address?.complement ?? "",
    neighborhood: address?.neighborhood ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const [couponInput, setCouponInput] = useState("");
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [applied, setApplied] = useState<AppliedCoupon | null>(null);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleCepBlur() {
    const digits = form.cep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepError(null);
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!res.ok || data.erro) {
        setCepError("CEP não encontrado");
      } else {
        setForm((f) => ({
          ...f,
          street: data.logradouro || f.street,
          neighborhood: data.bairro || f.neighborhood,
          city: data.localidade || f.city,
          state: data.uf || f.state,
        }));
      }
    } catch {
      setCepError("Não foi possível buscar o CEP agora — preencha manualmente.");
    } finally {
      setCepLoading(false);
    }
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim()) return;
    setCouponError(null);
    setCouponLoading(true);
    const res = await previewCouponAction(couponInput);
    setCouponLoading(false);
    if (res.ok) {
      setApplied({ code: couponInput.trim().toUpperCase(), discountCents: res.discountCents, freeShipping: res.freeShipping });
    } else {
      setApplied(null);
      setCouponError(res.error);
    }
  }

  function removeCoupon() {
    setApplied(null);
    setCouponInput("");
    setCouponError(null);
  }

  const freeByThreshold = freeShippingThresholdCents != null && subtotalCents >= freeShippingThresholdCents;
  const shippingCents = applied?.freeShipping || freeByThreshold ? 0 : flatShippingCents;
  const discountCents = applied?.discountCents ?? 0;
  const totalCents = subtotalCents - discountCents + shippingCents;

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const res = await createOrderAction({
      address: {
        cep: form.cep,
        street: form.street,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
      },
      couponCode: applied?.code,
    });
    if (res.ok) {
      // Navegação dura: mesmo padrão já usado em login/produto — garante que
      // a página do pedido releia o estado novo (carrinho vazio) do servidor.
      window.location.href = `${base}/pedido/${res.orderId}`;
      return;
    }
    setSaving(false);
    setError(res.error);
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <Link href={`${base}/carrinho`} className="text-sm text-stone-500 hover:underline">
        ← Voltar ao carrinho
      </Link>
      <h1 className="mt-3 text-xl font-medium">Finalizar compra</h1>
      <p className="mt-1 text-sm text-stone-500">Olá, {customerName}.</p>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium text-stone-500">Itens</h2>
        <ul className="mt-2 divide-y divide-stone-100">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center gap-3 py-2 text-sm">
              <Image
                src={item.imageUrl}
                alt=""
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-md bg-stone-100 object-cover"
              />
              <span className="flex-1">
                {item.qty}× {item.name}
              </span>
              <span className="tabular-nums">{formatBRL(item.unitPriceCents * item.qty)}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium text-stone-500">Endereço de entrega</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-4">
          <div>
            <label className={label}>CEP</label>
            <input
              className={input}
              inputMode="numeric"
              value={form.cep}
              onChange={(e) => set("cep", maskCep(e.target.value))}
              onBlur={handleCepBlur}
              placeholder="01310-100"
              maxLength={9}
            />
            {cepLoading && <p className="mt-1 text-xs text-stone-400">Buscando endereço…</p>}
            {cepError && !cepLoading && <p className="mt-1 text-xs text-amber-600">{cepError}</p>}
          </div>
          <div className="sm:col-span-3">
            <label className={label}>Rua</label>
            <input className={input} value={form.street} onChange={(e) => set("street", e.target.value)} />
          </div>
          <div>
            <label className={label}>Número</label>
            <input className={input} value={form.number} onChange={(e) => set("number", e.target.value)} />
          </div>
          <div className="sm:col-span-3">
            <label className={label}>Complemento (opcional)</label>
            <input
              className={input}
              value={form.complement}
              onChange={(e) => set("complement", e.target.value)}
              placeholder="Apto, bloco…"
            />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Bairro</label>
            <input className={input} value={form.neighborhood} onChange={(e) => set("neighborhood", e.target.value)} />
          </div>
          <div>
            <label className={label}>Cidade</label>
            <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
          </div>
          <div>
            <label className={label}>UF</label>
            <select className={input} value={form.state} onChange={(e) => set("state", e.target.value)}>
              <option value="">—</option>
              {UFS.map((uf) => (
                <option key={uf} value={uf}>
                  {uf}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <h2 className="text-sm font-medium text-stone-500">Cupom</h2>
        {applied ? (
          <div className="mt-2 flex items-center justify-between text-sm">
            <span className="font-medium text-green-700">
              {applied.code} aplicado {applied.freeShipping ? "— frete grátis" : `— -${formatBRL(applied.discountCents)}`}
            </span>
            <button type="button" onClick={removeCoupon} className="text-stone-400 underline-offset-2 hover:underline">
              Remover
            </button>
          </div>
        ) : (
          <div className="mt-2 flex gap-2">
            <input
              className={input.replace("mt-1 ", "")}
              value={couponInput}
              onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
              placeholder="Código do cupom"
            />
            <button
              type="button"
              onClick={handleApplyCoupon}
              disabled={couponLoading || !couponInput.trim()}
              className="h-10 shrink-0 rounded-lg border border-stone-300 px-4 text-sm font-medium hover:bg-stone-50 disabled:opacity-50"
            >
              {couponLoading ? "Aplicando…" : "Aplicar"}
            </button>
          </div>
        )}
        {couponError && <p className="mt-1 text-sm text-red-600">{couponError}</p>}
      </section>

      <section className="mt-6 rounded-lg border border-stone-200 bg-white p-4">
        <dl className="space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-stone-500">Subtotal</dt>
            <dd className="tabular-nums">{formatBRL(subtotalCents)}</dd>
          </div>
          {discountCents > 0 && (
            <div className="flex justify-between text-green-700">
              <dt>Desconto</dt>
              <dd className="tabular-nums">-{formatBRL(discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between">
            <dt className="text-stone-500">Frete</dt>
            <dd className="tabular-nums">{shippingCents === 0 ? "Grátis" : formatBRL(shippingCents)}</dd>
          </div>
          <div className="flex justify-between border-t border-stone-100 pt-1 font-medium">
            <dt>Total</dt>
            <dd className="tabular-nums">{formatBRL(totalCents)}</dd>
          </div>
        </dl>

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="mt-4 flex h-12 w-full items-center justify-center rounded-lg bg-stone-900 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {saving ? "Confirmando…" : "Confirmar pedido"}
        </button>
      </section>
    </main>
  );
}
