// app/api/webhooks/store-stripe/[storeId]/route.ts — webhook do Stripe DA LOJA
// (cada lojista usa a própria conta Stripe, não é Stripe Connect). O storeId
// na URL é o que permite escolher qual webhookSecret usar pra verificar a
// assinatura — é o próprio lojista quem cadastra essa URL no Dashboard dele.
// Não confundir com app/api/webhooks/stripe/route.ts, que é o webhook da
// PLATAFORMA (assinatura do plano Pro).
import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { decryptSecret } from "@/lib/crypto";
import { stripeClientFromConfig } from "@/lib/store-stripe";
import type { PaymentConfig } from "@/app/admin/actions/settings";

export async function POST(req: Request, { params }: { params: Promise<{ storeId: string }> }) {
  const { storeId } = await params;

  const store = await prisma.store.findUnique({ where: { id: storeId }, select: { paymentConfig: true } });
  const stripeCfg = (store?.paymentConfig as PaymentConfig | null)?.providers?.stripe;
  if (!stripeCfg?.webhookSecret || !stripeCfg?.secretKey) {
    return NextResponse.json({ error: "Webhook não configurado" }, { status: 500 });
  }

  const signature = req.headers.get("stripe-signature");
  const rawBody = await req.text(); // precisa do corpo cru, sem parse — a assinatura é sobre os bytes exatos
  if (!signature) return NextResponse.json({ error: "Assinatura ausente" }, { status: 400 });

  const stripeClient = stripeClientFromConfig(stripeCfg)!;
  let event: Stripe.Event;
  try {
    event = stripeClient.webhooks.constructEvent(rawBody, signature, decryptSecret(stripeCfg.webhookSecret));
  } catch (err) {
    console.error("Webhook Stripe (loja):", storeId, err);
    return NextResponse.json({ error: "Assinatura inválida" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      const paymentId = session.metadata?.paymentId;

      if (orderId && paymentId) {
        // Fora de runWithStore (requisição do Stripe, sem sessão/ALS) — todo
        // where precisa escopar por storeId/ids explicitamente. Só mexe no
        // Order se o Payment bateu certinho (id + orderId + o session.id que
        // nós mesmos geramos), fechando a porta pra um storeId alheio na URL
        // aprovar pedido de outra loja só adivinhando um orderId.
        // payment_intent vem de graça no evento — guardado aqui porque um
        // eventual estorno precisa do id do PaymentIntent (pi_...), diferente
        // do id da Checkout Session (cs_...) que já guardamos como providerPaymentId.
        const paymentIntentId =
          typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id;
        const payRes = await prisma.payment.updateMany({
          where: { id: paymentId, orderId, providerPaymentId: session.id },
          data: { status: "approved", rawPayload: { paymentIntentId } },
        });
        if (payRes.count === 1) {
          await prisma.order.updateMany({
            where: { id: orderId, storeId },
            data: { paymentStatus: "approved", fulfillmentStatus: "paid" },
          });
        }
      }
    }
    // Outros eventos são ignorados de propósito — checkout.session.completed
    // já é suficiente pro modo "payment" (pagamento único, não assinatura).
  } catch (err) {
    console.error("Webhook Stripe (loja): erro ao processar evento", storeId, event.type, err);
    return NextResponse.json({ error: "Erro ao processar evento" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
