// app/admin/perfil/profile-form.tsx
"use client";

import { useState } from "react";
import { updateProfileAction, type UserAddress } from "@/app/admin/actions/profile";
import { maskPhone, maskCpf, maskCep } from "@/lib/format";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

const input =
  "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const inputLocked =
  "mt-1 h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500";
const label = "block text-sm font-medium text-neutral-700";

type Profile = {
  name: string | null;
  email: string;
  phone: string | null;
  cnpj: string | null;
  cpf: string | null;
  address: UserAddress | null;
};

export function ProfileForm({ profile }: { profile: Profile }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: profile.name ?? "",
    phone: profile.phone ?? "",
    cpf: profile.cpf ? maskCpf(profile.cpf) : "",
    cep: profile.address?.cep ? maskCep(profile.address.cep) : "",
    street: profile.address?.street ?? "",
    number: profile.address?.number ?? "",
    complement: profile.address?.complement ?? "",
    neighborhood: profile.address?.neighborhood ?? "",
    city: profile.address?.city ?? "",
    state: profile.address?.state ?? "",
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
    setSaved(false);
    setSaving(true);
    const res = await updateProfileAction({
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
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="text-2xl font-medium">Meu perfil</h1>
      <p className="mt-1 text-sm text-neutral-500">
        E-mail e CNPJ não podem ser alterados por aqui — fale com a plataforma para corrigi-los.
      </p>
      <p className="mt-1 text-xs text-neutral-400">
        CPF e endereço identificam quem assina pela empresa — necessários para contratos e correspondência legal.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className={label}>Nome</label>
          <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </div>

        <div>
          <label className={label}>Telefone</label>
          <input
            type="tel"
            className={input}
            value={form.phone}
            onChange={(e) => set("phone", maskPhone(e.target.value))}
            maxLength={15}
          />
        </div>

        <div>
          <label className={label}>E-mail</label>
          <input className={inputLocked} value={profile.email} disabled readOnly />
        </div>

        <div>
          <label className={label}>CNPJ</label>
          <input className={inputLocked} value={profile.cnpj ?? "não informado"} disabled readOnly />
        </div>

        <div>
          <label className={label}>CPF do responsável</label>
          <input
            className={input}
            inputMode="numeric"
            value={form.cpf}
            onChange={(e) => set("cpf", maskCpf(e.target.value))}
            placeholder="123.456.789-00"
            maxLength={14}
          />
        </div>

        <div>
          <h2 className="text-sm font-medium text-neutral-700">Endereço</h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            Informe o CEP pra preencher rua, bairro, cidade e UF automaticamente.
          </p>
          <div className="mt-2 grid grid-cols-4 gap-3">
            <div className="col-span-2">
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
              {cepLoading && <p className="mt-1 text-xs text-neutral-400">Buscando endereço…</p>}
              {cepError && !cepLoading && <p className="mt-1 text-xs text-amber-600">{cepError}</p>}
            </div>
            <div className="col-span-2">
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
            <div className="col-span-4">
              <label className={label}>Rua</label>
              <input className={input} value={form.street} onChange={(e) => set("street", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label}>Número</label>
              <input className={input} value={form.number} onChange={(e) => set("number", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label}>Complemento</label>
              <input className={input} value={form.complement} onChange={(e) => set("complement", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={label}>Bairro</label>
              <input
                className={input}
                value={form.neighborhood}
                onChange={(e) => set("neighborhood", e.target.value)}
              />
            </div>
            <div className="col-span-2">
              <label className={label}>Cidade</label>
              <input className={input} value={form.city} onChange={(e) => set("city", e.target.value)} />
            </div>
          </div>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {saved && !saving && <p className="text-sm text-green-700">Perfil atualizado.</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="h-10 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </main>
  );
}
