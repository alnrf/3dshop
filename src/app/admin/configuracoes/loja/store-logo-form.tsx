// app/admin/configuracoes/loja/store-logo-form.tsx
"use client";

import { useState } from "react";
import { getLogoUploadUrlAction, saveLogoAction } from "@/app/admin/actions/branding";
import { r2Url } from "@/lib/r2";

export function StoreLogoForm({ logoKey }: { logoKey: string | null }) {
  const [preview, setPreview] = useState<string>(r2Url(logoKey ?? undefined));
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    setSaved(false);
    setUploading(true);

    const uploadUrl = await getLogoUploadUrlAction(file.type);
    if (!uploadUrl.ok) {
      setUploading(false);
      setError(uploadUrl.error);
      return;
    }

    const put = await fetch(uploadUrl.url, { method: "PUT", body: file, headers: { "Content-Type": file.type } });
    if (!put.ok) {
      setUploading(false);
      setError("Falha ao enviar a imagem");
      return;
    }

    const res = await saveLogoAction(uploadUrl.key);
    setUploading(false);
    if (res.ok) {
      setPreview(URL.createObjectURL(file));
      setSaved(true);
    } else {
      setError(res.error);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="text-2xl font-medium">Loja</h1>
      <p className="mt-1 text-sm text-neutral-500">
        O logotipo aparece no navbar da vitrine da loja.
      </p>

      <div className="mt-6 flex items-center gap-4">
        <img
          src={preview}
          alt=""
          className="size-16 rounded-lg border border-neutral-200 bg-neutral-50 object-contain"
        />
        <div>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block text-sm"
          />
          {uploading && <p className="mt-1 text-sm text-neutral-500">Enviando…</p>}
          {saved && !uploading && <p className="mt-1 text-sm text-green-700">Logo atualizado.</p>}
          {error && (
            <p role="alert" className="mt-1 text-sm text-red-600">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
