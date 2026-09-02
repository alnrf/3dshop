// app/admin/actions/subscription.ts — assinatura do plano Pro (lojista pagando
// a plataforma via Stripe Billing). O cartão nunca passa pelo nosso servidor:
// tanto a assinatura quanto o cancelamento acontecem nas páginas hospedadas
// do Stripe (Checkout e Customer Portal); nós só criamos a sessão e recebemos
// o resultado depois via webhook (app/api/webhooks/stripe/route.ts).
"use server";

import { prisma } from "@/lib/prisma";
import { getActiveStoreId, requireStoreAccess } from "@/lib/tenant";
import { stripe, isStripeConfigured } from "@/lib/stripe";
import { baseUrl } from "@/lib/url";

export type CheckoutResult = { ok: true; url: string } | { ok: false; error: string };

/** Cria (ou reaproveita) o Customer no Stripe e devolve a URL do Checkout de assinatura. */
export async function startCheckoutAction(): Promise<CheckoutResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Assinatura Pro ainda não está configurada pela plataforma." };
  }

  const storeId = await getActiveStoreId();
  const { userId } = await requireStoreAccess(storeId);

  const [store, owner] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeId } }),
    prisma.user.findUnique({ where: { id: userId } }),
  ]);
  if (!store) return { ok: false, error: "Loja não encontrada" };
  if (store.plan === "pro") return { ok: false, error: "Esta loja já está no plano Pro" };

  let customerId = store.stripeCustomerId;
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: owner?.email,
      name: owner?.name ?? undefined,
      metadata: { storeId },
    });
    customerId = customer.id;
    await prisma.store.update({ where: { id: storeId }, data: { stripeCustomerId: customerId } });
  }

  const origin = await baseUrl();
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_PRO, quantity: 1 }],
    success_url: `${origin}/admin/plano?checkout=sucesso`,
    cancel_url: `${origin}/admin/plano?checkout=cancelado`,
    metadata: { storeId },
    subscription_data: { metadata: { storeId } },
  });

  if (!session.url) return { ok: false, error: "Não foi possível iniciar o checkout" };
  return { ok: true, url: session.url };
}

/** URL do Customer Portal do Stripe — de lá o lojista troca cartão ou cancela a assinatura. */
export async function manageSubscriptionAction(): Promise<CheckoutResult> {
  if (!isStripeConfigured()) {
    return { ok: false, error: "Assinatura Pro ainda não está configurada pela plataforma." };
  }

  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  const store = await prisma.store.findUnique({ where: { id: storeId } });
  if (!store?.stripeCustomerId) return { ok: false, error: "Nenhuma assinatura encontrada para esta loja" };

  const origin = await baseUrl();
  const session = await stripe.billingPortal.sessions.create({
    customer: store.stripeCustomerId,
    return_url: `${origin}/admin/plano`,
  });

  return { ok: true, url: session.url };
}
