// app/admin/configuracoes/frete/shipping-settings-form.tsx
"use client";

import { useState } from "react";
import {
  saveShippingSettingsAction,
  type ShippingSettingsInput,
  type getShippingSettingsAction,
} from "@/app/admin/actions/settings";
import { inputClass, labelClass, fieldsetClass, legendClass, SecretField } from "../shared";
import { maskCep, maskPhone } from "@/lib/format";

type Config = Awaited<ReturnType<typeof getShippingSettingsAction>>;

type ProviderId = "superfrete" | "melhorenvio";

const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
];

export function ShippingSettingsForm({ config }: { config: Config }) {
  const [activeProvider, setActiveProvider] = useState<ProviderId | null>(config.activeProvider);
  const [originCep, setOriginCep] = useState(config.originCep ? maskCep(config.originCep) : "");
  const [originAddress, setOriginAddress] = useState({
    street: config.originAddress.street,
    number: config.originAddress.number,
    complement: config.originAddress.complement,
    district: config.originAddress.district,
    city: config.originAddress.city,
    stateAbbr: config.originAddress.stateAbbr,
    phone: config.originAddress.phone ? maskPhone(config.originAddress.phone) : "",
    document: config.originAddress.document ?? "",
  });
  const [cepLoading, setCepLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function setOrigin<K extends keyof typeof originAddress>(key: K, value: string) {
    setOriginAddress((a) => ({ ...a, [key]: value }));
  }

  async function handleOriginCepBlur() {
    const digits = originCep.replace(/\D/g, "");
    if (digits.length !== 8) return;
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (res.ok && !data.erro) {
        setOriginAddress((a) => ({
          ...a,
          street: data.logradouro || a.street,
          district: data.bairro || a.district,
          city: data.localidade || a.city,
          stateAbbr: data.uf || a.stateAbbr,
        }));
      }
    } catch {
      // silencioso — o lojista ainda pode preencher manualmente
    } finally {
      setCepLoading(false);
    }
  }

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
      originCep,
      originAddress,
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
    <div>
      <h2 className="text-sm font-medium text-neutral-500">Cotação real por transportadora</h2>
      <p className="mt-1 text-xs text-neutral-400">
        Com Superfrete ou Melhor Envio ativo e configurado, o checkout cota o frete de verdade pelo CEP do
        comprador — o frete fixo acima vira só o reserva (sem cotação configurada, erro na cotação, ou sem CEP de
        origem). As chaves/tokens ficam encriptados — nunca são exibidos de volta na tela.
      </p>

      <div className="mt-3 space-y-5">
        <fieldset className={fieldsetClass}>
          <legend className={legendClass}>Endereço de origem (de onde a loja despacha)</legend>
          <p className="text-xs text-neutral-400">
            CEP é necessário pra cotação real funcionar. O endereço completo + telefone/documento só são necessários
            se você for gerar etiqueta de postagem direto pela loja.
          </p>
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className={labelClass}>CEP</label>
              <input
                className={inputClass}
                inputMode="numeric"
                value={originCep}
                onChange={(e) => setOriginCep(maskCep(e.target.value))}
                onBlur={handleOriginCepBlur}
                placeholder="01310-100"
                maxLength={9}
              />
              {cepLoading && <p className="mt-1 text-xs text-neutral-400">Buscando endereço…</p>}
            </div>
            <div className="col-span-2">
              <label className={labelClass}>UF</label>
              <select className={inputClass} value={originAddress.stateAbbr} onChange={(e) => setOrigin("stateAbbr", e.target.value)}>
                <option value="">—</option>
                {UFS.map((uf) => (
                  <option key={uf} value={uf}>
                    {uf}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-4">
              <label className={labelClass}>Rua</label>
              <input className={inputClass} value={originAddress.street} onChange={(e) => setOrigin("street", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Número</label>
              <input className={inputClass} value={originAddress.number} onChange={(e) => setOrigin("number", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Complemento</label>
              <input className={inputClass} value={originAddress.complement} onChange={(e) => setOrigin("complement", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Bairro</label>
              <input className={inputClass} value={originAddress.district} onChange={(e) => setOrigin("district", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Cidade</label>
              <input className={inputClass} value={originAddress.city} onChange={(e) => setOrigin("city", e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>Telefone</label>
              <input
                className={inputClass}
                value={originAddress.phone}
                onChange={(e) => setOrigin("phone", maskPhone(e.target.value))}
                placeholder="(11) 91234-5678"
                maxLength={15}
              />
            </div>
            <div className="col-span-2">
              <label className={labelClass}>CPF/CNPJ do remetente</label>
              <input
                className={inputClass}
                value={originAddress.document}
                onChange={(e) => setOrigin("document", e.target.value.replace(/\D/g, ""))}
              />
            </div>
          </div>
        </fieldset>

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
            label="Token de acesso pessoal"
            placeholder="Gerado em Permissões de acesso, no painel Melhor Envio"
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
    </div>
  );
}
