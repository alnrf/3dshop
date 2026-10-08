// app/plataforma/entrar/login-form.tsx
"use client";

import { useState } from "react";
import { loginOperatorAction } from "@/app/actions/operator-auth";
import { PasswordInput } from "@/components/password-input";

const input =
  "h-11 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const res = await loginOperatorAction({ email, password });
    setSaving(false);
    // Navegação dura de propósito (mesmo motivo do /entrar geral): volta pra
    // esta própria página, que decide se a conta é admin ou desconecta de novo.
    if (res.ok) window.location.href = "/plataforma/entrar";
    else setError(res.error);
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
      <PasswordInput
        placeholder="Senha"
        className={input}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
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
        className="h-11 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {saving ? "Entrando…" : "Entrar"}
      </button>
    </div>
  );
}
