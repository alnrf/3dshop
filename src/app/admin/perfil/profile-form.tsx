// app/admin/perfil/profile-form.tsx
"use client";

import { useState } from "react";
import { updateProfileAction } from "@/app/admin/actions/profile";
import { maskPhone } from "@/lib/format";

const input =
  "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const inputLocked =
  "mt-1 h-10 w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 text-sm text-neutral-500";
const label = "block text-sm font-medium text-neutral-700";

type Profile = { name: string | null; email: string; phone: string | null; cnpj: string | null };

export function ProfileForm({ profile }: { profile: Profile }) {
  const [name, setName] = useState(profile.name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await updateProfileAction({ name, phone });
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

      <div className="mt-6 space-y-5">
        <div>
          <label className={label}>Nome</label>
          <input className={input} value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div>
          <label className={label}>Telefone</label>
          <input
            type="tel"
            className={input}
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            maxLength={15}
          />
        </div>

        <div>
          <label className={label}>E-mail</label>
          <input className={inputLocked} value={profile.email} disabled readOnly />
        </div>

        <div>
          <label className={label}>CNPJ</label>
          <input
            className={inputLocked}
            value={profile.cnpj ?? "não informado"}
            disabled
            readOnly
          />
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
