// app/plataforma/lojas/[id]/danger-zone.tsx
"use client";

import { useState } from "react";
import { suspendStoreAction, reactivateStoreAction, deleteStoreAction } from "@/app/plataforma/actions/stores";

export function DangerZone({
  storeId,
  status,
  orderCount,
}: {
  storeId: string;
  status: string;
  orderCount: number;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusState, setStatusState] = useState(status);
  const [deleting, setDeleting] = useState(false);

  async function toggleSuspend() {
    setError(null);
    setPending(true);
    const res =
      statusState === "active" ? await suspendStoreAction(storeId) : await reactivateStoreAction(storeId);
    setPending(false);
    if (res.ok) setStatusState(statusState === "active" ? "suspended" : "active");
    else setError(res.error);
  }

  async function handleDelete() {
    if (
      !window.confirm(
        "Excluir esta loja permanentemente? Produtos, clientes e carrinhos vão junto. Essa ação não pode ser desfeita.",
      )
    )
      return;
    setError(null);
    setPending(true);
    const res = await deleteStoreAction(storeId);
    if (res.ok) {
      setDeleting(true);
      window.location.href = "/plataforma/lojas";
      return;
    }
    setPending(false);
    setError(res.error);
  }

  const canToggle = statusState === "active" || statusState === "suspended";

  return (
    <section className="mt-8 rounded-lg border border-red-200 p-4">
      <h2 className="text-sm font-medium text-red-700">Zona de perigo</h2>

      {canToggle && (
        <div className="mt-3 flex items-center justify-between gap-4">
          <p className="text-sm text-neutral-600">
            {statusState === "active"
              ? "Inativar bloqueia a vitrine e o painel do lojista até reativar — reversível, nada é apagado."
              : "Loja inativa: vitrine e painel do lojista bloqueados."}
          </p>
          <button
            type="button"
            onClick={toggleSuspend}
            disabled={pending}
            className="h-9 shrink-0 cursor-pointer rounded-lg border border-neutral-300 px-3 text-sm font-medium hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? "…" : statusState === "active" ? "Inativar loja" : "Reativar loja"}
          </button>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-4 border-t border-red-100 pt-4">
        <p className="text-sm text-neutral-600">
          {orderCount > 0
            ? `Exclusão bloqueada: esta loja já teve ${orderCount} pedido(s) — inative em vez disso, pra preservar o histórico.`
            : "Apaga a loja e todos os dados (produtos, clientes, carrinhos) permanentemente. Só liberado sem pedido nenhum no histórico."}
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={pending || deleting || orderCount > 0}
          className="h-9 shrink-0 cursor-pointer rounded-lg bg-red-600 px-3 text-sm font-medium text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {deleting ? "Excluindo…" : "Excluir loja"}
        </button>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600">
          {error}
        </p>
      )}
    </section>
  );
}
