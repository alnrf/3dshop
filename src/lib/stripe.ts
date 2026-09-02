// lib/stripe.ts — cliente Stripe para a assinatura da PLATAFORMA (cobrar o
// lojista pelo plano Pro). Não confundir com Store.paymentConfig, que é o
// gateway de CADA loja para cobrar o cliente final — coisas completamente
// separadas, com credenciais e contas diferentes.
//
// Sem chave configurada, o client ainda instancia (não faz I/O na construção);
// quem chama a API é que deve checar isStripeConfigured() antes e devolver um
// erro amigável, em vez de deixar a chamada de rede falhar feio.
import Stripe from "stripe";

// || (não ??): no .env local a variável existe como string vazia "" enquanto
// não configurada — "" é nullish-safe mas falsy, e ?? não cairia no fallback.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "sk_test_not_configured");

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_PRO && process.env.STRIPE_WEBHOOK_SECRET);
}
