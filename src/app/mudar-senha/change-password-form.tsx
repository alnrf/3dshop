// app/mudar-senha/change-password-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { changePasswordAction } from "@/app/actions/account";

const input =
  "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const label = "block text-sm font-medium text-neutral-700";

export function ChangePasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (password !== confirm) {
      setError("As senhas não coincidem");
      return;
    }
    setSaving(true);
    const res = await changePasswordAction(password);
    setSaving(false);
    if (res.ok) router.push("/admin/produtos");
    else setError(res.error);
  }

  return (
    <main className="mx-auto max-w-sm px-6 py-16">
      <h1 className="text-xl font-medium">Defina sua senha</h1>
      <p className="mt-2 text-sm text-neutral-500">
        Este é seu primeiro acesso. Escolha uma nova senha para continuar.
      </p>

      <div className="mt-6 space-y-4">
        <div>
          <label className={label}>Nova senha</label>
          <input
            type="password"
            className={input}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div>
          <label className={label}>Confirme a nova senha</label>
          <input
            type="password"
            className={input}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="h-10 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {saving ? "Salvando…" : "Salvar e entrar"}
        </button>
      </div>
    </main>
  );
}
