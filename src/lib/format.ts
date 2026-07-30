// lib/format.ts

/** Formata centavos (Int) como moeda brasileira. Ex.: 4990 -> "R$ 49,90" */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Normaliza texto livre num slug de URL. Ex.: "Vaso Geométrico" -> "vaso-geometrico" */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
