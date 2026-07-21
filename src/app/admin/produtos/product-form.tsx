// app/admin/produtos/product-form.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createProductAction,
  updateProductAction,
  getUploadUrlAction,
  type ProductInput,
} from "@/app/admin/actions/products";
import { r2Url } from "@/lib/r2";

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
  images: { r2Key: string }[];
};

const input =
  "mt-1 h-10 w-full rounded-lg border border-neutral-300 px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2";
const label = "block text-sm font-medium text-neutral-700";

export function ProductForm({ product }: { product?: ExistingProduct }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [images, setImages] = useState<{ key: string; url: string }[]>(
    product?.images.map((i) => ({ key: i.r2Key, url: r2Url(i.r2Key) })) ?? [],
  );

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
    active: product?.active ?? true,
  });

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    for (const file of Array.from(files)) {
      const res = await getUploadUrlAction(file.type);
      if (!res.ok) {
        setError(res.error);
        continue;
      }
      const put = await fetch(res.url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!put.ok) {
        setError("Falha ao enviar a imagem");
        continue;
      }
      setImages((imgs) => [...imgs, { key: res.key, url: URL.createObjectURL(file) }]);
    }
    setUploading(false);
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
      imageKeys: images.map((i) => i.key),
    };
    const res = product
      ? await updateProductAction(product.id, payload)
      : await createProductAction(payload);
    setSaving(false);
    if (res.ok) router.push("/admin/produtos");
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
            <input
              className={input}
              value={form.material}
              onChange={(e) => set("material", e.target.value)}
              placeholder="PLA, PETG, resina…"
            />
          </div>
          <div>
            <label className={label}>Tempo de impressão</label>
            <input
              className={input}
              value={form.printTime}
              onChange={(e) => set("printTime", e.target.value)}
              placeholder="cerca de 4 horas"
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
              onChange={(e) => set("stock", e.target.value)}
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
              <input className={input} inputMode="numeric" value={form.weightGrams} onChange={(e) => set("weightGrams", e.target.value)} />
            </div>
            <div>
              <label className={label}>Larg. (cm)</label>
              <input className={input} inputMode="numeric" value={form.widthCm} onChange={(e) => set("widthCm", e.target.value)} />
            </div>
            <div>
              <label className={label}>Alt. (cm)</label>
              <input className={input} inputMode="numeric" value={form.heightCm} onChange={(e) => set("heightCm", e.target.value)} />
            </div>
            <div>
              <label className={label}>Comp. (cm)</label>
              <input className={input} inputMode="numeric" value={form.lengthCm} onChange={(e) => set("lengthCm", e.target.value)} />
            </div>
          </div>
        </fieldset>

        <div>
          <label className={label}>Imagens</label>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handleFiles(e.target.files)}
            className="mt-1 block text-sm"
          />
          {uploading && <p className="mt-2 text-sm text-neutral-500">Enviando…</p>}
          {images.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-3">
              {images.map((img, i) => (
                <div key={img.key} className="relative">
                  <img
                    src={img.url}
                    alt=""
                    className="size-20 rounded-lg border border-neutral-200 object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setImages((imgs) => imgs.filter((_, j) => j !== i))}
                    aria-label="Remover imagem"
                    className="absolute -right-2 -top-2 flex size-6 items-center justify-center rounded-full bg-neutral-900 text-xs text-white"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
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
            disabled={saving || uploading}
            className="h-10 rounded-lg bg-neutral-900 px-5 text-sm font-medium text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
          >
            {saving ? "Salvando…" : "Salvar produto"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/produtos")}
            className="h-10 rounded-lg border border-neutral-300 px-5 text-sm font-medium"
          >
            Cancelar
          </button>
        </div>
      </div>
    </main>
  );
}
