// app/loja/[slug]/produto/[produto]/product-detail.tsx
"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCartAction } from "@/app/actions/cart";
import { formatBRL, formatPrintTime } from "@/lib/format";
import { CartQuantityControl } from "@/components/cart-quantity-control";

export function ProductDetail({
  base,
  id,
  name,
  description,
  priceCents,
  stock,
  material,
  printTime,
  weightGrams,
  widthCm,
  heightCm,
  lengthCm,
  tags,
  images,
  cartQty,
}: {
  base: string;
  id: string;
  name: string;
  description: string | null;
  priceCents: number;
  stock: number;
  material: string | null;
  printTime: string | null;
  weightGrams: number;
  widthCm: number;
  heightCm: number;
  lengthCm: number;
  tags: string[];
  images: string[];
  cartQty: number;
}) {
  const [active, setActive] = useState(0);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [cartQtyState, setCartQtyState] = useState(cartQty);
  const soldOut = stock <= 0;

  function prevImage() {
    setActive((a) => (a - 1 + images.length) % images.length);
  }
  function nextImage() {
    setActive((a) => (a + 1) % images.length);
  }

  function add() {
    setError(null);
    startTransition(async () => {
      const res = await addToCartAction(id, 1);
      if (res.ok) setCartQtyState(1);
      else setError(res.error);
    });
  }

  const formattedPrintTime = formatPrintTime(printTime);

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <Link href={base} className="text-sm text-neutral-500 hover:underline">
        ← Voltar aos produtos
      </Link>

      <div className="mt-4 md:grid md:grid-cols-2 md:gap-10">
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
          {images.length > 1 && (
            <>
              <button
                type="button"
                onClick={prevImage}
                aria-label="Imagem anterior"
                className="absolute left-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-neutral-700 shadow hover:bg-white"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={nextImage}
                aria-label="Próxima imagem"
                className="absolute right-2 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg text-neutral-700 shadow hover:bg-white"
              >
                ›
              </button>
            </>
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

        {(material || formattedPrintTime) && (
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {material && (
              <div>
                <dt className="text-neutral-500">Material</dt>
                <dd className="font-medium">{material}</dd>
              </div>
            )}
            {formattedPrintTime && (
              <div>
                <dt className="text-neutral-500">Tempo de impressão</dt>
                <dd className="font-medium">{formattedPrintTime}</dd>
              </div>
            )}
          </dl>
        )}

        <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-neutral-500">Peso</dt>
            <dd className="font-medium">{weightGrams} g</dd>
          </div>
          <div>
            <dt className="text-neutral-500">Dimensões</dt>
            <dd className="font-medium">
              {widthCm} × {heightCm} × {lengthCm} cm
            </dd>
          </div>
        </dl>

        {description && (
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-neutral-700">
            {description}
          </p>
        )}

        {tags.length > 0 && (
          <div className="mt-4">
            <h2 className="text-sm font-medium text-stone-500">Tags</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span key={tag} className="rounded-md bg-stone-100 px-2.5 py-1 text-sm text-stone-700">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="mt-4 text-sm text-neutral-500">
          {soldOut
            ? "Indisponível no momento"
            : stock <= 5
              ? `Últimas ${stock} unidades`
              : "Em estoque"}
        </p>

        {!soldOut && (
          <div className="mt-4">
            {cartQtyState > 0 ? (
              <CartQuantityControl
                productId={id}
                stock={stock}
                qty={cartQtyState}
                onQtyChange={setCartQtyState}
                onRemoved={() => setCartQtyState(0)}
              />
            ) : (
              <button
                type="button"
                onClick={add}
                disabled={pending}
                className="h-12 w-full rounded-lg bg-neutral-900 text-sm font-medium text-white disabled:opacity-40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 md:w-auto md:px-8"
              >
                {pending ? "Adicionando…" : "Adicionar ao carrinho"}
              </button>
            )}
          </div>
        )}

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
      </div>
    </main>
  );
}
