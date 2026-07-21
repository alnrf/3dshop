// app/loja/[slug]/produto/[produto]/product-detail.tsx
"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { addToCartAction } from "@/app/actions/cart";
import { formatBRL } from "@/lib/format";

export function ProductDetail({
  id,
  name,
  description,
  priceCents,
  stock,
  material,
  printTime,
  images,
}: {
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  material: string | null;
  printTime: string | null;
  images: string[];
}) {
  const [active, setActive] = useState(0);
  const [qty, setQty] = useState(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const soldOut = stock <= 0;

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction(id, qty);
      if (res.ok) {
        setAdded(true);
        setTimeout(() => setAdded(false), 1500);
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-6 md:grid md:grid-cols-2 md:gap-10">
      {/* Carrossel */}
      <div>
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-neutral-100">
          {images.length > 0 && (
            <Image
              src={images[active]}
              alt={name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
            />
          )}
        </div>
        {images.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {images.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Imagem ${i + 1}`}
                aria-current={i === active}
                className={`relative size-16 shrink-0 overflow-hidden rounded-lg border-2 ${
                  i === active ? "border-neutral-900" : "border-transparent"
                }`}
              >
                <Image src={src} alt="" fill sizes="64px" className="object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Informações */}
      <div className="mt-6 md:mt-0">
        <h1 className="text-xl font-medium md:text-2xl">{name}</h1>
        <p className="mt-2 text-lg font-medium tabular-nums">{formatBRL(priceCents)}</p>

        {(material || printTime) && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {material && (
              <div>
                <dt className="text-neutral-500">Material</dt>
                <dd className="font-medium">{material}</dd>
              </div>
            )}
            {printTime && (
              <div>
                <dt className="text-neutral-500">Tempo de impressão</dt>
                <dd className="font-medium">{printTime}</dd>
              </div>
            )}
          </dl>
        )}

        {description && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
            {description}
          </p>
        )}

        <p className="mt-4 text-sm text-neutral-500">
          {soldOut
            ? "Indisponível no momento"
            : stock <= 5
              ? `Últimas ${stock} unidades`
              : "Em estoque"}
        </p>

        {!soldOut && (
          <div className="mt-4 inline-flex items-center rounded-lg border border-neutral-300">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              disabled={qty <= 1}
              aria-label="Diminuir quantidade"
              className="flex h-11 w-11 items-center justify-center text-lg disabled:opacity-40"
            >
              −
            </button>
            <span aria-live="polite" className="w-8 text-center text-sm tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => setQty((q) => Math.min(stock, q + 1))}
              disabled={qty >= stock}
              aria-label="Aumentar quantidade"
              className="flex h-11 w-11 items-center justify-center text-lg disabled:opacity-40"
            >
              +
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={add}
          disabled={pending || soldOut}
          className="mt-4 h-12 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:w-auto md:px-8"
        >
          {soldOut
            ? "Indisponível"
            : added
              ? "Adicionado ✓"
              : pending
                ? "Adicionando…"
                : "Adicionar ao carrinho"}
        </button>

        {soldOut && (
          <p className="mt-3 text-sm text-neutral-500">
            Quer sob encomenda?{" "}
            <span className="underline underline-offset-2">Solicite um orçamento</span>{" "}
            (em breve).
          </p>
        )}

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-600">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}
