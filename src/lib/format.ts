// lib/format.ts

/** Formata centavos (Int) como moeda brasileira. Ex.: 4990 -> "R$ 49,90" */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}
