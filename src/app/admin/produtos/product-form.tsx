// app/admin/produtos/product-form.tsx
"use client";

import { useRef, useState } from "react";
import {
  createProductAction,
  updateProductAction,
  getUploadUrlAction,
  type ProductInput,
} from "@/app/admin/actions/products";
import { r2Url } from "@/lib/r2";
import { sanitizePrintTime } from "@/lib/format";

type ExistingProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  material: string | null;
  printTime: string | null;
  priceCents: number;
  stock: number;
  weightGrams: number;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  active: boolean;
  tags: string[];
  images: { r2Key: string }[];
};

const input =
  "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const label = "block text-sm font-medium text-neutral-700";

const MATERIALS = ["PLA", "ABS", "PETG", "TPU", "Resina"];

export function ProductForm({ product }: { product?: ExistingProduct }) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<{ key: string; url: string }[]>(
    product?.images.map((i) => ({ key: i.r2Key, url: r2Url(i.r2Key) })) ?? [],
  );
  const [tags, setTags] = useState<string[]>(product?.tags ?? []);
  const [tagInput, setTagInput] = useState("");

  // Campos em reais para preço; convertidos para centavos no submit.
  const [form, setForm] = useState({
    name: product?.name ?? "",
    slug: product?.slug ?? "",
    description: product?.description ?? "",
    material: product?.material ?? "",
    printTime: product?.printTime ?? "",
    price: product ? (product.priceCents / 100).toFixed(2) : "",
    stock: String(product?.stock ?? 0),
    weightGrams: String(product?.weightGrams ?? ""),
    widthCm: String(product?.widthCm ?? ""),
    heightCm: String(product?.heightCm ?? ""),
    lengthCm: String(product?.lengthCm ?? ""),
    // Padrão desmarcado: produto novo não deve ficar visível na loja antes
    // do lojista revisar e decidir publicar.
    active: product?.active ?? false,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  /** Só dígitos — evita que o campo vire texto não-numérico e o submit mande
   *  NaN pro servidor (que chega lá como "$NaN" e antes vazava cru na tela). */
  function setDigitsOnly<K extends keyof typeof form>(key: K, raw: string) {
    set(key, raw.replace(/\D/g, "") as (typeof form)[K]);
  }

  /** Dígitos + um único ponto decimal (peso e medidas aceitam fração: 12.5g). */
  function setDecimalOnly<K extends keyof typeof form>(key: K, raw: string) {
    const cleaned = raw.replace(/[^\d.]/g, "");
    const firstDot = cleaned.indexOf(".");
    const normalized =
      firstDot === -1 ? cleaned : cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, "");
    set(key, normalized as (typeof form)[K]);
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    setTagInput("");
    if (!tag || tags.includes(tag)) return;
    setTags((t) => [...t, tag]);
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      setTags((t) => t.slice(0, -1));
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    setError(null);
    setUploadingCount((n) => n + list.length);
    for (const file of list) {
      const res = await getUploadUrlAction(file.type);
      if (!res.ok) {
        setError(res.error);
        setUploadingCount((n) => n - 1);
        continue;
      }
      const put = await fetch(res.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) {
        setError("Falha ao enviar a imagem");
        setUploadingCount((n) => n - 1);
        continue;
      }
      setImages((imgs) => [...imgs, { key: res.key, url: URL.createObjectURL(file) }]);
      setUploadingCount((n) => n - 1);
    }
  }

  async function handleSubmit() {
    setError(null);
    setSaving(true);
    const payload: ProductInput = {
      name: form.name,
      slug: form.slug,
      description: form.description || undefined,
      material: form.material || undefined,
      printTime: form.printTime || undefined,
      priceCents: Math.round(parseFloat(form.price || "0") * 100),
      stock: Number(form.stock),
      weightGrams: Number(form.weightGrams),
      widthCm: Number(form.widthCm),
      heightCm: Number(form.heightCm),
      lengthCm: Number(form.lengthCm),
      active: form.active,
      tags,
      imageKeys: images.map((i) => i.key),
    };
    const res = product
      ? await updateProductAction(product.id, payload)
      : await createProductAction(payload);
    setSaving(false);
    // Navegação DURA (não router.push): já vimos router.push travar numa
    // página que checa tenant de novo no server (mesmo caso do login) —
    // o produto salvava certinho, mas a tela ficava presa no formulário.
    if (res.ok) window.location.href = "/admin/produtos";
    else setError(res.error);
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <h1 className="text-2xl font-medium">
        {product ? "Editar produto" : "Novo produto"}
      </h1>

      <div className="mt-6 space-y-5">
        <div>
          <label className={label}>Nome</label>
          <input
            className={input}
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div>
          <label className={label}>Slug (opcional — gerado do nome)</label>
          <input
            className={input}
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="vaso-geometrico-pequeno"
          />
        </div>

        <div>
          <label className={label}>Descrição</label>
          <textarea
            className="mt-1 w-full rounded-lg border border-neutral-300 p-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Material</label>
            <select className={input} value={form.material} onChange={(e) => set("material", e.target.value)}>
              <option value="">Selecione…</option>
              {MATERIALS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Tempo de impressão (H:MM)</label>
            <input
              className={input}
              inputMode="numeric"
              value={form.printTime}
              onChange={(e) => set("printTime", sanitizePrintTime(e.target.value))}
              placeholder="4:30 — ou 124:30 para impressões longas"
              maxLength={6}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={label}>Preço (R$)</label>
            <input
              className={input}
              inputMode="decimal"
              value={form.price}
              onChange={(e) => set("price", e.target.value)}
              placeholder="49,90"
            />
          </div>
          <div>
            <label className={label}>Estoque</label>
            <input
              className={input}
              inputMode="numeric"
              value={form.stock}
              onChange={(e) => setDigitsOnly("stock", e.target.value)}
            />
          </div>
        </div>

        {/* Dados de embalagem para cotar frete no Melhor Envio */}
        <fieldset className="rounded-lg border border-neutral-200 p-4">
          <legend className="px-1 text-sm font-medium text-neutral-700">
            Embalagem (para o frete)
          </legend>
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className={label}>Peso (g)</label>
              <input className={input} inputMode="decimal" value={form.weightGrams} onChange={(e) => setDecimalOnly("weightGrams", e.target.value)} placeholder="12.5" />
            </div>
            <div>
              <label className={label}>Larg. (cm)</label>
              <input className={input} inputMode="decimal" value={form.widthCm} onChange={(e) => setDecimalOnly("widthCm", e.target.value)} />
            </div>
            <div>
              <label className={label}>Alt. (cm)</label>
              <input className={input} inputMode="decimal" value={form.heightCm} onChange={(e) => setDecimalOnly("heightCm", e.target.value)} />
            </div>
            <div>
              <label className={label}>Comp. (cm)</label>
              <input className={input} inputMode="decimal" value={form.lengthCm} onChange={(e) => setDecimalOnly("lengthCm", e.target.value)} />
            </div>
          </div>
        </fieldset>

        <div>
          <label className={label}>Imagens</label>

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
              handleFiles(e.dataTransfer.files);
            }}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === "Enter" && fileInputRef.current?.click()}
            className={`mt-1 flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
              dragOver ? "border-neutral-900 bg-neutral-50" : "border-neutral-300 hover:border-neutral-400"
            }`}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="size-8 text-neutral-400"
            >
              <path d="M7 18a4.5 4.5 0 0 1-1.44-8.765 5.5 5.5 0 0 1 10.616-2.348A4.5 4.5 0 0 1 17.5 18H7Z" />
              <path d="M12 12v6m0-6 2.5 2.5M12 12 9.5 14.5" />
            </svg>
            <p className="text-sm text-neutral-600">
              <span className="font-medium text-neutral-900">Clique para enviar</span> ou arraste as imagens aqui
            </p>
            <p className="text-xs text-neutral-400">PNG ou JPG — pode selecionar várias de uma vez</p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = ""; // permite selecionar o mesmo arquivo de novo depois de remover
              }}
              className="hidden"
            />
          </div>

          {(images.length > 0 || uploadingCount > 0) && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {images.map((img, i) => (
                <div
                  key={img.key}
                  className="group relative aspect-square overflow-hidden rounded-lg border border-neutral-200 bg-neutral-50"
                >
                  <img src={img.url} alt="" className="size-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                    aria-label="Remover imagem"
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-neutral-900/70 text-sm text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
                  >
                    ×
                  </button>
                  {images.length > 1 && (
                    <label className="absolute inset-x-0 bottom-0 flex cursor-pointer items-center gap-1.5 bg-neutral-900/70 px-2 py-1 text-xs text-white">
                      <input
                        type="radio"
                        name="cover-image"
                        checked={i === 0}
                        onChange={() => setImages((imgs) => [imgs[i], ...imgs.filter((_, j) => j !== i)])}
                        className="size-3 accent-white"
                      />
                      Capa
                    </label>
                  )}
                </div>
              ))}
              {Array.from({ length: uploadingCount }).map((_, i) => (
                <div
                  key={`uploading-${i}`}
                  className="flex aspect-square items-center justify-center rounded-lg border border-neutral-200 bg-neutral-50"
                >
                  <span className="size-5 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className={label}>Tags</label>
          <p className="mt-0.5 text-xs text-neutral-500">Ajudam na busca por produtos. Enter ou vírgula para adicionar.</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 rounded-lg border border-neutral-300 p-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-sm text-neutral-700"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((t) => t.filter((x) => x !== tag))}
                  aria-label={`Remover tag ${tag}`}
                  className="text-neutral-400 hover:text-neutral-700"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              onBlur={addTag}
              placeholder={tags.length === 0 ? "organizer, office, pen…" : ""}
              className="h-8 min-w-24 flex-1 border-none text-sm outline-none focus-visible:outline-none"
            />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => set("active", e.target.checked)}
          />
          Produto ativo (visível na loja)
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={saving || uploadingCount > 0}
            className="h-10 rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {saving ? "Salvando…" : "Salvar produto"}
          </button>
          <button
            type="button"
            onClick={() => (window.location.href = "/admin/produtos")}
            className="h-10 rounded-lg border border-neutral-300 px-5 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </main>
  );
}
