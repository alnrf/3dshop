// app/loja/[slug]/esqueci-senha/forgot-password-form.tsx
"use client";

import { useState } from "react";
import { requestPasswordResetAction } from "@/app/actions/customer-auth";

const input =
  "h-11 w-full rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function ForgotPasswordForm({ storeSlug }: { storeSlug: string }) {
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const res = await requestPasswordResetAction({ storeSlug, email });
    setSaving(false);
    // A action sempre responde ok (não revela se o e-mail existe) — só o
    // erro de validação (e-mail mal formado) aparece aqui.
    if (res.ok) setSent(true);
    else setError(res.error);
  }

  if (sent) {
    return (
      <p className="text-sm text-stone-600">
        Se <strong>{email}</strong> estiver cadastrado nesta loja, você vai receber um e-mail com o link de
        redefinição em instantes.
      </p>
    );
  }

  return (
    <div className="space-y-3 text-left">
      <input
        type="email"
        placeholder="E-mail"
        className={input}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
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
        className="h-11 w-full cursor-pointer rounded-lg bg-stone-900 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {saving ? "Enviando…" : "Enviar link de recuperação"}
      </button>
    </div>
  );
}
