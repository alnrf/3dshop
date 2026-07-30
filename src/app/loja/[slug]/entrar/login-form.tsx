// app/loja/[slug]/entrar/login-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginCustomerAction } from "@/app/actions/customer-auth";

const input =
  "h-11 w-full rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function LoginForm({ storeSlug, base }: { storeSlug: string; base: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const res = await loginCustomerAction({ storeSlug, email, password });
    setSaving(false);
    if (res.ok) router.push(`${base}/pos-login`);
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
      <input
        type="password"
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
        className="h-11 w-full rounded-lg bg-stone-900 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
      >
        {saving ? "Entrando…" : "Entrar"}
      </button>
    </div>
  );
}
