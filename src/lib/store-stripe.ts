// lib/store-stripe.ts — cliente Stripe DA LOJA (cobra o cliente final com a
// própria conta Stripe do lojista). Não confundir com lib/stripe.ts, que é o
// cliente da PLATAFORMA (cobra o lojista pela assinatura Pro).
import Stripe from "stripe";
import { decryptSecret } from "./crypto";

/** Constrói o client a partir do blob já lido de Store.paymentConfig.providers.stripe.
 *  Sem I/O de rede — só decripta a chave e instancia. null se não configurado. */
export function stripeClientFromConfig(stripeCfg: { secretKey?: string } | undefined | null): Stripe | null {
  if (!stripeCfg?.secretKey) return null;
  return new Stripe(decryptSecret(stripeCfg.secretKey));
}
