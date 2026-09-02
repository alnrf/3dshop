// app/admin/plano/plan-actions.tsx
"use client";

import { useState } from "react";
import { startCheckoutAction, manageSubscriptionAction } from "@/app/admin/actions/subscription";

export function PlanActions({ plan, stripeConfigured }: { plan: string; stripeConfigured: boolean }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpgrade() {
    setError(null);
    setLoading(true);
    const res = await startCheckoutAction();
    if (res.ok) {
      window.location.href = res.url;
      return;
    }
    setLoading(false);
    setError(res.error);
  }

  async function handleManage() {
    setError(null);
    setLoading(true);
    const res = await manageSubscriptionAction();
    if (res.ok) {
      window.location.href = res.url;
      return;
    }
    setLoading(false);
    setError(res.error);
  }

  if (!stripeConfigured) {
    return <p className="text-sm text-neutral-400">Assinatura self-service ainda não disponível — fale com a plataforma para mudar de plano.</p>;
  }

  return (
    <div>
      {plan === "pro" ? (
        <button
          type="button"
          onClick={handleManage}
          disabled={loading}
          className="h-10 rounded-lg border border-neutral-300 px-4 text-sm font-medium text-neutral-700 hover:bg-neutral-50 disabled:opacity-50"
        >
          {loading ? "Abrindo…" : "Gerenciar assinatura"}
        </button>
      ) : (
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={loading}
          className="h-10 rounded-lg bg-neutral-900 px-4 text-sm font-medium text-white disabled:opacity-50"
        >
          {loading ? "Abrindo…" : "Assinar Pro"}
        </button>
      )}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
