// app/admin/configuracoes/pagamentos/payment-settings-form.tsx
"use client";

import { useState } from "react";
import {
  savePaymentSettingsAction,
  type PaymentSettingsInput,
  type getPaymentSettingsAction,
} from "@/app/admin/actions/settings";
import { inputClass, labelClass, fieldsetClass, legendClass, SecretField } from "../shared";

type Config = Awaited<ReturnType<typeof getPaymentSettingsAction>>;

type ProviderId = "stripe" | "pagseguro" | "mercadopago";

export function PaymentSettingsForm({ config }: { config: Config }) {
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(config.activeProvider);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [stripe, setStripe] = useState({
    enabled: config.stripe.enabled,
    acceptPix: config.stripe.acceptPix,
    publishableKey: config.stripe.publishableKey,
    value: "",
    clear: false,
    configured: config.stripe.secretKeyConfigured,
  });
  const [pagseguro, setPagseguro] = useState({
    enabled: config.pagseguro.enabled,
    acceptPix: config.pagseguro.acceptPix,
    value: "",
    clear: false,
    configured: config.pagseguro.tokenConfigured,
  });
  const [mercadopago, setMercadopago] = useState({
    enabled: config.mercadopago.enabled,
    acceptPix: config.mercadopago.acceptPix,
    value: "",
    clear: false,
    configured: config.mercadopago.accessTokenConfigured,
  });

  const enabledProviders = [
    stripe.enabled && "stripe",
    pagseguro.enabled && "pagseguro",
    mercadopago.enabled && "mercadopago",
  ].filter(Boolean) as ProviderId[];

  async function handleSubmit() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const payload: PaymentSettingsInput = {
      activeProvider,
      stripe: {
        enabled: stripe.enabled,
        acceptPix: stripe.acceptPix,
        publishableKey: stripe.publishableKey,
        value: stripe.value,
        clear: stripe.clear,
      },
      pagseguro: {
        enabled: pagseguro.enabled,
        acceptPix: pagseguro.acceptPix,
        value: pagseguro.value,
        clear: pagseguro.clear,
      },
      mercadopago: {
        enabled: mercadopago.enabled,
        acceptPix: mercadopago.acceptPix,
        value: mercadopago.value,
        clear: mercadopago.clear,
      },
    };
    const res = await savePaymentSettingsAction(payload);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setStripe((s) => ({ ...s, value: "", clear: false, configured: s.clear ? false : s.value ? true : s.configured }));
      setPagseguro((s) => ({ ...s, value: "", clear: false, configured: s.clear ? false : s.value ? true : s.configured }));
      setMercadopago((s) => ({ ...s, value: "", clear: false, configured: s.clear ? false : s.value ? true : s.configured }));
    } else {
      setError(res.error);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-medium">Pagamentos</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cadastre as credenciais dos meios de pagamento desta loja. As chaves ficam
        encriptadas — nunca são exibidas de volta na tela.
      </p>

      <div className="mt-6 space-y-5">
        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Stripe</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stripe.enabled}
              onChange={(e) => setStripe((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Ativar Stripe
          </label>
          <div>
            <label className={labelClass}>Chave publicável (publishable key)</label>
            <input
              className={inputClass}
              value={stripe.publishableKey}
              onChange={(e) => setStripe((s) => ({ ...s, publishableKey: e.target.value }))}
              placeholder="pk_live_…"
            />
          </div>
          <SecretField
            label="Chave secreta (secret key)"
            placeholder="sk_live_…"
            value={stripe.value}
            configured={stripe.configured && !stripe.clear}
            onChange={(v) => setStripe((s) => ({ ...s, value: v, clear: false }))}
            onRemove={() => setStripe((s) => ({ ...s, value: "", clear: true, configured: false }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={stripe.acceptPix}
              onChange={(e) => setStripe((s) => ({ ...s, acceptPix: e.target.checked }))}
            />
            Aceitar Pix via Stripe
          </label>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>PagSeguro</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pagseguro.enabled}
              onChange={(e) => setPagseguro((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Ativar PagSeguro
          </label>
          <SecretField
            label="Token de integração"
            value={pagseguro.value}
            configured={pagseguro.configured && !pagseguro.clear}
            onChange={(v) => setPagseguro((s) => ({ ...s, value: v, clear: false }))}
            onRemove={() => setPagseguro((s) => ({ ...s, value: "", clear: true, configured: false }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pagseguro.acceptPix}
              onChange={(e) => setPagseguro((s) => ({ ...s, acceptPix: e.target.checked }))}
            />
            Aceitar Pix via PagSeguro
          </label>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Mercado Pago</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mercadopago.enabled}
              onChange={(e) => setMercadopago((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Ativar Mercado Pago
          </label>
          <SecretField
            label="Access token"
            value={mercadopago.value}
            configured={mercadopago.configured && !mercadopago.clear}
            onChange={(v) => setMercadopago((s) => ({ ...s, value: v, clear: false }))}
            onRemove={() => setMercadopago((s) => ({ ...s, value: "", clear: true, configured: false }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={mercadopago.acceptPix}
              onChange={(e) => setMercadopago((s) => ({ ...s, acceptPix: e.target.checked }))}
            />
            Aceitar Pix via Mercado Pago
          </label>
        </fieldset>

        <div>
          <label className={labelClass}>Provedor padrão no checkout</label>
          <select
            className={inputClass}
            value={activeProvider ?? ""}
            onChange={(e) => setActiveProvider((e.target.value || null) as ProviderId | null)}
          >
            <option value="">Nenhum selecionado</option>
            {enabledProviders.map((id) => (
              <option key={id} value={id}>
                {id === "stripe" ? "Stripe" : id === "pagseguro" ? "PagSeguro" : "Mercado Pago"}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        {saved && !error && <p className="text-sm text-green-700">Configurações salvas.</p>}

        <button
          type="button"
          onClick={handleSubmit}
          disabled={saving}
          className="h-10 rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
        >
          {saving ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </main>
  );
}
