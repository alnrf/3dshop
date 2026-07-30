// app/admin/configuracoes/frete/shipping-settings-form.tsx
"use client";

import { useState } from "react";
import {
  saveShippingSettingsAction,
  type ShippingSettingsInput,
  type getShippingSettingsAction,
} from "@/app/admin/actions/settings";
import { inputClass, labelClass, fieldsetClass, legendClass, SecretField } from "../shared";

type Config = Awaited<ReturnType<typeof getShippingSettingsAction>>;

type ProviderId = "superfrete" | "melhorenvio";

export function ShippingSettingsForm({ config }: { config: Config }) {
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(config.activeProvider);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [superfrete, setSuperfrete] = useState({
    enabled: config.superfrete.enabled,
    sandbox: config.superfrete.sandbox,
    value: "",
    clear: false,
    configured: config.superfrete.apiTokenConfigured,
  });
  const [melhorenvio, setMelhorenvio] = useState({
    enabled: config.melhorenvio.enabled,
    sandbox: config.melhorenvio.sandbox,
    value: "",
    clear: false,
    configured: config.melhorenvio.apiTokenConfigured,
  });

  const enabledProviders = [
    superfrete.enabled && "superfrete",
    melhorenvio.enabled && "melhorenvio",
  ].filter(Boolean) as ProviderId[];

  async function handleSubmit() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const payload: ShippingSettingsInput = {
      activeProvider,
      superfrete: {
        enabled: superfrete.enabled,
        sandbox: superfrete.sandbox,
        value: superfrete.value,
        clear: superfrete.clear,
      },
      melhorenvio: {
        enabled: melhorenvio.enabled,
        sandbox: melhorenvio.sandbox,
        value: melhorenvio.value,
        clear: melhorenvio.clear,
      },
    };
    const res = await saveShippingSettingsAction(payload);
    setSaving(false);
    if (res.ok) {
      setSaved(true);
      setSuperfrete((s) => ({ ...s, value: "", clear: false, configured: s.clear ? false : s.value ? true : s.configured }));
      setMelhorenvio((s) => ({ ...s, value: "", clear: false, configured: s.clear ? false : s.value ? true : s.configured }));
    } else {
      setError(res.error);
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-medium">Frete</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Cadastre as credenciais do serviço de frete desta loja. As chaves ficam
        encriptadas — nunca são exibidas de volta na tela.
      </p>

      <div className="mt-6 space-y-5">
        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Superfrete</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={superfrete.enabled}
              onChange={(e) => setSuperfrete((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Ativar Superfrete
          </label>
          <SecretField
            label="Token de API"
            value={superfrete.value}
            configured={superfrete.configured && !superfrete.clear}
            onChange={(v) => setSuperfrete((s) => ({ ...s, value: v, clear: false }))}
            onRemove={() => setSuperfrete((s) => ({ ...s, value: "", clear: true, configured: false }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={superfrete.sandbox}
              onChange={(e) => setSuperfrete((s) => ({ ...s, sandbox: e.target.checked }))}
            />
            Usar ambiente de testes (sandbox)
          </label>
        </fieldset>

        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Melhor Envio</legend>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={melhorenvio.enabled}
              onChange={(e) => setMelhorenvio((s) => ({ ...s, enabled: e.target.checked }))}
            />
            Ativar Melhor Envio
          </label>
          <SecretField
            label="Token de API"
            value={melhorenvio.value}
            configured={melhorenvio.configured && !melhorenvio.clear}
            onChange={(v) => setMelhorenvio((s) => ({ ...s, value: v, clear: false }))}
            onRemove={() => setMelhorenvio((s) => ({ ...s, value: "", clear: true, configured: false }))}
          />
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={melhorenvio.sandbox}
              onChange={(e) => setMelhorenvio((s) => ({ ...s, sandbox: e.target.checked }))}
            />
            Usar ambiente de testes (sandbox)
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
                {id === "superfrete" ? "Superfrete" : "Melhor Envio"}
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
