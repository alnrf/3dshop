// app/plataforma/lojas/[id]/owner-details.tsx
"use client";

import { useState } from "react";
import { updateStoreOwnerAction } from "@/app/plataforma/actions/stores";
import { maskPhone, maskCnpj } from "@/lib/format";

const row = "flex justify-between gap-4 border-b border-neutral-100 py-3 text-sm";
const dt = "text-neutral-500";
const dd = "font-medium text-neutral-900";
const input =
  "mt-1 h-9 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const label = "block text-xs font-medium text-neutral-500";

type Owner = { name: string | null; email: string; phone: string | null; cnpj: string | null };

export function OwnerDetails({ storeId, owner }: { storeId: string; owner: Owner | undefined }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: owner?.name ?? "",
    email: owner?.email ?? "",
    phone: owner?.phone ?? "",
    cnpj: owner?.cnpj ?? "",
  });

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    const res = await updateStoreOwnerAction(storeId, form);
    setSaving(false);
    if (res.ok) setEditing(false);
    else setError(res.error);
  }

  if (!owner) {
    return <p className="mt-2 text-sm text-neutral-400">Loja sem dono cadastrado.</p>;
  }

  if (!editing) {
    return (
      <div className="mt-2">
        <dl>
          <div className={row}>
            <dt className={dt}>Nome</dt>
            <dd className={dd}>{owner.name ?? "—"}</dd>
          </div>
          <div className={row}>
            <dt className={dt}>E-mail</dt>
            <dd className={dd}>{owner.email}</dd>
          </div>
          <div className={row}>
            <dt className={dt}>Telefone</dt>
            <dd className={dd}>{owner.phone ?? "não informado"}</dd>
          </div>
          <div className={row}>
            <dt className={dt}>CNPJ</dt>
            <dd className={dd}>{owner.cnpj ?? "não informado"}</dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="mt-3 text-sm text-neutral-700 underline-offset-2 hover:underline"
        >
          Editar
        </button>
      </div>
    );
  }

  return (
    <div className="mt-2 space-y-3">
      <div>
        <label className={label}>Nome</label>
        <input className={input} value={form.name} onChange={(e) => set("name", e.target.value)} />
      </div>
      <div>
        <label className={label}>E-mail</label>
        <input
          type="email"
          className={input}
          value={form.email}
          onChange={(e) => set("email", e.target.value)}
        />
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
        <label className={label}>CNPJ</label>
        <input
          className={input}
          value={form.cnpj}
          onChange={(e) => set("cnpj", maskCnpj(e.target.value))}
          maxLength={18}
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-3 pt-1">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="h-9 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            setError(null);
            setForm({
              name: owner.name ?? "",
              email: owner.email,
              phone: owner.phone ?? "",
              cnpj: owner.cnpj ?? "",
            });
          }}
          disabled={saving}
          className="h-9 rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-700 disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
