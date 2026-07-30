// app/onboarding/onboarding-form.tsx
"use client";

import { useState } from "react";
import { submitOnboardingAction, type OnboardingInput } from "@/app/actions/onboarding";

const input =
  "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const label = "block text-sm font-medium text-neutral-700";

const CONTRACT_TEXT = `Termo de Uso e Contrato de Serviço (rascunho)

Ao cadastrar sua loja nesta plataforma, você concorda em:
- Fornecer informações verdadeiras sobre você e seu negócio;
- Ser o único responsável pelos produtos anunciados, pelos preços e pelo
  atendimento aos seus clientes;
- Cumprir a legislação aplicável, incluindo o Código de Defesa do Consumidor;
- Configurar por sua conta as credenciais dos meios de pagamento e do serviço
  de frete que deseja usar — a plataforma não processa pagamentos em nome da
  sua loja.

Este texto é um rascunho inicial e será substituído pelo contrato definitivo.`;

export function OnboardingForm() {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    ownerName: "",
    email: "",
    storeName: "",
    contractAccepted: false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const payload: OnboardingInput = form;
    const res = await submitOnboardingAction(payload);
    setSaving(false);
    if (res.ok) setDone(true);
    else setError(res.error);
  }

  if (done) {
    return (
      <main className="mx-auto max-w-md px-6 py-16 text-center">
        <h1 className="text-xl font-medium">Cadastro recebido</h1>
        <p className="mt-3 text-sm text-neutral-600">
          Vamos analisar seu cadastro. Assim que sua loja for aprovada, você recebe
          um e-mail com as credenciais de acesso ao painel.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 py-12">
      <h1 className="text-2xl font-medium">Cadastre sua loja</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Preencha seus dados para começar a vender.
      </p>

      <div className="mt-6 space-y-5">
        <div>
          <label className={label}>Seu nome</label>
          <input
            className={input}
            value={form.ownerName}
            onChange={(e) => set("ownerName", e.target.value)}
          />
        </div>

        <div>
          <label className={label}>Seu e-mail</label>
          <input
            type="email"
            className={input}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </div>

        <div>
          <label className={label}>Nome da loja</label>
          <input
            className={input}
            value={form.storeName}
            onChange={(e) => set("storeName", e.target.value)}
            placeholder="Impressões 3D da Ana"
          />
        </div>

        <div>
          <label className={label}>Contrato de serviço</label>
          <pre className="mt-1 h-40 overflow-y-auto whitespace-pre-wrap rounded-lg border border-neutral-300 p-3 text-xs text-neutral-600">
            {CONTRACT_TEXT}
          </pre>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={form.contractAccepted}
            onChange={(e) => set("contractAccepted", e.target.checked)}
          />
          Li e aceito o contrato de serviço
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving || !form.contractAccepted}
          className="h-10 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {saving ? "Enviando…" : "Cadastrar loja"}
        </button>
      </div>
    </main>
  );
}
