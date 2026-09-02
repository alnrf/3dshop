// app/api/webhooks/stripe/route.ts — fonte de verdade da assinatura. O
// Checkout/Portal só inicia a sessão; é este webhook que efetivamente muda
// Store.plan, porque só ele reflete o que o Stripe confirmou (pagamento
// aprovado, cancelamento, etc.) — nunca o redirect de volta ao success_url.
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { downgradeStoreToFree } from "@/lib/plans";

async function storeIdFromCustomer(
  customer: string | Stripe.Customer | Stripe.DeletedCustomer | null,
): Promise<string | null> {
  const customerId = typeof customer === "string" ? customer : customer?.id;
  if (!customerId) return null;
  const store = await prisma.store.findUnique({ where: { stripeCustomerId: customerId }, select: { id: true } });
  return store?.id ?? null;
}

export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text(); // precisa do corpo cru, sem parse — a assinatura é sobre os bytes exatos
  if (!signature) return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("Webhook Stripe: assinatura inválida", err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      // Confirma o vínculo assinatura↔loja assim que o Checkout fecha (o status
      // definitivo ainda vem pelos eventos de subscription abaixo).
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const storeId = session.metadata?.storeId;
        const subscriptionId =
          typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
        if (storeId && subscriptionId) {
          await prisma.store.update({ where: { id: storeId }, data: { stripeSubscriptionId: subscriptionId } });
        }
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const storeId = subscription.metadata?.storeId ?? (await storeIdFromCustomer(subscription.customer));
        if (!storeId) break;

        if (subscription.status === "active" || subscription.status === "trialing") {
          await prisma.store.update({
            where: { id: storeId },
            data: { plan: "pro", stripeSubscriptionId: subscription.id, subscriptionStatus: subscription.status },
          });
        } else {
          // past_due, unpaid, incomplete_expired, etc. — mesmo estilo padrão de
          // assinatura: sem pagamento em dia, cai pro free até regularizar.
          await downgradeStoreToFree(storeId);
          await prisma.store.update({ where: { id: storeId }, data: { subscriptionStatus: subscription.status } });
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const storeId = subscription.metadata?.storeId ?? (await storeIdFromCustomer(subscription.customer));
        if (!storeId) break;

        await downgradeStoreToFree(storeId);
        await prisma.store.update({ where: { id: storeId }, data: { subscriptionStatus: "canceled" } });
        break;
      }

      default:
        break; // eventos não tratados são ignorados de propósito
    }
  } catch (err) {
    console.error("Webhook Stripe: erro ao processar evento", event.type, err);
    return NextResponse.json({ error: "Erro ao processar evento" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
