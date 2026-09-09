// app/loja/[slug]/redefinir-senha/reset-password-form.tsx
"use client";

import { useState } from "react";
import { resetPasswordAction } from "@/app/actions/customer-auth";

const input =
  "h-11 w-full rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function ResetPasswordForm({
  storeSlug,
  token,
  base,
}: {
  storeSlug: string;
  token: string;
  base: string;
}) {
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
    const res = await resetPasswordAction({ storeSlug, token, password });
    if (res.ok) {
      // Navegação dura: garante que o login releia tudo do zero.
      window.location.href = `${base}/entrar`;
      return;
    }
    setSaving(false);
    setError(res.error);
  }

  return (
    <div className="space-y-3 text-left">
      <input
        type="password"
        placeholder="Nova senha"
        className={input}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <input
        type="password"
        placeholder="Confirme a nova senha"
        className={input}
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={saving}
        className="h-11 w-full rounded-lg bg-stone-900 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {saving ? "Salvando…" : "Redefinir senha"}
      </button>
    </div>
  );
}
