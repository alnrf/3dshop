// app/loja/[slug]/perfil/profile-form.tsx
"use client";

import { useState } from "react";
import { updateCustomerProfileAction } from "@/app/actions/customer-profile";
import { maskPhone, maskCpf, maskCep } from "@/lib/format";
import type { CustomerAddress } from "@/lib/customer";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const input =
  "mt-1 h-10 w-full rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const label = "block text-sm font-medium text-stone-700";

export function ProfileForm({
  name,
  phone,
  cpf,
  address,
}: {
  name: string;
  phone: string | null;
  cpf: string | null;
  address: CustomerAddress | null;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name,
    phone: phone ? maskPhone(phone) : "",
    cpf: cpf ? maskCpf(cpf) : "",
    cep: address?.cep ? maskCep(address.cep) : "",
    street: address?.street ?? "",
    number: address?.number ?? "",
    complement: address?.complement ?? "",
    neighborhood: address?.neighborhood ?? "",
    city: address?.city ?? "",
    state: address?.state ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  /** Busca o CEP na ViaCEP (gratuita, sem chave) e preenche rua/bairro/cidade/UF
   *  — continuam editáveis, é só um atalho pra não digitar tudo à mão. */
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

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const res = await updateCustomerProfileAction({
      name: form.name,
      phone: form.phone,
      cpf: form.cpf,
      address: {
        cep: form.cep,
        street: form.street,
        number: form.number,
        complement: form.complement,
        neighborhood: form.neighborhood,
        city: form.city,
        state: form.state,
      },
    });
    setSaving(false);
    if (res.ok) setSaved(true);
    else setError(res.error);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-sm font-medium text-stone-500">Dados pessoais</h2>
        <div className="mt-2 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label}>Nome</label>
            <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
          </div>
          <div>
            <label className={label}>Telefone</label>
            <input
              className={input}
              inputMode="tel"
              value={form.phone}
              onChange={(e) => set("phone", maskPhone(e.target.value))}
              placeholder="(11) 91234-5678"
              maxLength={15}
            />
          </div>
          <div>
            <label className={label}>CPF</label>
            <input
              className={input}
              inputMode="numeric"
              value={form.cpf}
              onChange={(e) => set("cpf", maskCpf(e.target.value))}
              placeholder="123.456.789-00"
              maxLength={14}
            />
            <p className="mt-1 text-xs text-stone-400">Usado na nota fiscal do pedido.</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-stone-500">Endereço de entrega</h2>
        <p className="mt-0.5 text-xs text-stone-400">
          Informe o CEP pra preencher rua, bairro, cidade e UF automaticamente — depois é só completar número e
          complemento. Também dá pra digitar tudo manualmente.
        </p>
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
            <input
              className={input}
              value={form.neighborhood}
              onChange={(e) => set("neighborhood", e.target.value)}
            />
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
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {saved && !saving && <p className="text-sm text-green-700">Dados salvos.</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="h-10 cursor-pointer rounded-lg bg-stone-900 px-5 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {saving ? "Salvando…" : "Salvar dados"}
      </button>
    </div>
  );
}
