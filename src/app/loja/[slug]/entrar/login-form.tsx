// app/loja/[slug]/entrar/login-form.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { loginCustomerAction } from "@/app/actions/customer-auth";

const input =
  "h-11 w-full rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function LoginForm({
  storeSlug,
  base,
  next,
}: {
  storeSlug: string;
  base: string;
  next?: string | null;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const res = await loginCustomerAction({ storeSlug, email, password });
    if (res.ok) {
      // Navegação "dura" (não router.push): o header (layout) já pode estar
      // em cache do lado do cliente com o estado "deslogado" de antes do
      // login — só um reload completo garante que ele releia a sessão nova.
      window.location.href = next ? `${base}/pos-login?next=${encodeURIComponent(next)}` : `${base}/pos-login`;
      return;
    }
    setSaving(false);
    setError(res.error);
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
      <input
        type="password"
        placeholder="Senha"
        className={input}
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <p className="text-right text-xs">
        <Link href={`${base}/esqueci-senha`} className="text-stone-500 underline-offset-2 hover:underline">
          Esqueci minha senha
        </Link>
      </p>
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
        {saving ? "Entrando…" : "Entrar"}
      </button>
    </div>
  );
}
