// lib/checkout.ts
// Frete padrão quando a loja ainda não configurou flatShippingCents — evita
// bloquear a compra ou dar frete grátis sem querer por falta de configuração.
export const DEFAULT_FLAT_SHIPPING_CENTS = 2000; // R$ 20,00
