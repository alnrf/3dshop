// app/admin/configuracoes/loja/store-logo-form.tsx
"use client";

import { useRef, useState } from "react";
import { getLogoUploadUrlAction, saveLogoAction } from "@/app/admin/actions/branding";
import { r2Url } from "@/lib/r2";

const ACCEPTED_TYPES = ["image/png", "image/jpeg", "image/svg+xml", "image/webp"];
const ACCEPTED_LABEL = "PNG, JPG, SVG ou WebP";
const MAX_SIZE_BYTES = 2 * 1024 * 1024;
const MAX_SIZE_LABEL = "2 MB";
const MIN_DIMENSION = 128;

export function StoreLogoForm({ logoKey }: { logoKey: string | null }) {
  const [preview, setPreview] = useState<string>(r2Url(logoKey ?? undefined));
  const [hasLogo, setHasLogo] = useState(Boolean(logoKey));
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Dimensão só é checável de verdade em formatos raster — SVG é vetorial, pula a checagem. */
  function checkMinDimensions(file: File): Promise<boolean> {
    if (file.type === "image/svg+xml") return Promise.resolve(true);
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        resolve(img.naturalWidth >= MIN_DIMENSION && img.naturalHeight >= MIN_DIMENSION);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(true); // não deu pra checar — não bloqueia por isso
      };
      img.src = url;
    });
  }

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    setSaved(false);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError(`Formato não aceito. Use ${ACCEPTED_LABEL}.`);
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setError(`Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(1)} MB). O máximo é ${MAX_SIZE_LABEL}.`);
      return;
    }
    if (!(await checkMinDimensions(file))) {
      setError(`Imagem muito pequena. O mínimo recomendado é ${MIN_DIMENSION}×${MIN_DIMENSION}px.`);
      return;
    }

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
      setHasLogo(true);
      setSaved(true);
    } else {
      setError(res.error);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <h1 className="text-2xl font-medium">Loja</h1>
      <p className="mt-1 text-sm text-neutral-500">O logotipo aparece no navbar da vitrine da loja.</p>

      <div className="mt-6">
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0] ?? null);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
          className={`flex cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed p-5 transition-colors ${
            dragOver ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 hover:border-neutral-400"
          }`}
        >
          {hasLogo ? (
            <img
              src={preview}
              alt=""
              className="size-16 shrink-0 rounded-lg border border-neutral-200 bg-white object-contain"
            />
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-10 shrink-0 text-neutral-400"
            >
              <path d="M7 18a4.5 4.5 0 0 1-1.44-8.765 5.5 5.5 0 0 1 10.616-2.348A4.5 4.5 0 0 1 17.5 18H7Z" />
              <path d="M12 12v6m0-6 2.5 2.5M12 12 9.5 14.5" />
            </svg>
          )}

          <div className="min-w-0">
            {uploading ? (
              <p className="text-sm text-neutral-500">Enviando…</p>
            ) : (
              <>
                <p className="text-sm text-neutral-700">
                  <span className="font-medium text-neutral-900">Clique para enviar</span> ou arraste a imagem aqui
                </p>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {ACCEPTED_LABEL} — até {MAX_SIZE_LABEL}, mínimo {MIN_DIMENSION}×{MIN_DIMENSION}px (recomendado
                  quadrado, fundo transparente)
                </p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            onChange={(e) => {
              handleFile(e.target.files?.[0] ?? null);
              e.target.value = ""; // permite reenviar o mesmo arquivo depois de um erro
            }}
            className="hidden"
          />
        </div>

        {saved && !uploading && <p className="mt-2 text-sm text-green-700">Logo atualizado.</p>}
        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
