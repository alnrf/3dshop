// app/admin/configuracoes/shared.tsx — pedaços reusados pelos forms de
// pagamento e frete (mesmo padrão visual de admin/produtos/product-form.tsx).
"use client";

export const inputClass =
  "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
export const labelClass = "block text-sm font-medium text-neutral-700";
export const fieldsetClass = "rounded-lg border border-neutral-200 p-4 space-y-4";
export const legendClass = "px-1 text-sm font-medium text-neutral-900";

/**
 * Campo de segredo (chave de API, token): nunca recebe o valor real do server,
 * só uma flag `configured`. Em branco = mantém o valor já guardado; "Remover"
 * limpa explicitamente, para nunca perder uma credencial por um submit vazio.
 */
export function SecretField({
  label,
  placeholder = "Cole o valor aqui",
  value,
  configured,
  onChange,
  onRemove,
}: {
  label: string;
  placeholder?: string;
  value: string;
  configured: boolean;
  onChange: (v: string) => void;
  onRemove: () => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="mt-1 flex gap-2">
        <input
          type="password"
          autoComplete="off"
          className={inputClass.replace("mt-1 ", "")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={configured ? "Configurado — deixe em branco para manter" : placeholder}
        />
        {configured && (
          <button
            type="button"
            onClick={onRemove}
            className="shrink-0 whitespace-nowrap text-sm text-red-600 underline-offset-2 hover:underline"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
