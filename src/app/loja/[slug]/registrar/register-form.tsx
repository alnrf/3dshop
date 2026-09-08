// app/loja/[slug]/registrar/register-form.tsx
"use client";

import { useState } from "react";
import { registerCustomerAction } from "@/app/actions/customer-auth";

const input =
  "h-11 w-full rounded-lg border border-stone-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";

export function RegisterForm({ storeSlug, base }: { storeSlug: string; base: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
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
    const res = await registerCustomerAction({ storeSlug, name, email, password });
    if (res.ok) {
      // Navegação "dura" (não router.push): o header (layout) já pode estar
      // em cache do lado do cliente com o estado "deslogado" de antes do
      // cadastro — só um reload completo garante que ele releia a sessão nova.
      window.location.href = `${base}/pos-login`;
      return;
    }
    setSaving(false);
    setError(res.error);
  }

  return (
    <div className="space-y-3 text-left">
      <input placeholder="Nome" className={input} value={name} onChange={(e) => setName(e.target.value)} />
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
      <input
        type="password"
        placeholder="Confirme a senha"
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
        {saving ? "Criando conta…" : "Criar conta"}
      </button>
    </div>
  );
}
