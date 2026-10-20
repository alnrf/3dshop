// app/actions/checkout.ts
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withStore } from "@/lib/tenant";
import { currentCustomer } from "@/lib/customer";
import { getCartWithItems } from "@/lib/cart";
import { validateCoupon, consumeCoupon } from "@/lib/coupons";
import { DEFAULT_FLAT_SHIPPING_CENTS } from "@/lib/checkout";
import { stripeClientFromConfig } from "@/lib/store-stripe";
import { quoteShipping } from "@/lib/superfrete";
import { quoteMelhorEnvio } from "@/lib/melhor-envio";
import type { ShippingOption } from "@/lib/shipping-types";
import { decryptSecret } from "@/lib/crypto";
import { baseUrl } from "@/lib/url";
import type { PaymentConfig, ShippingConfig } from "@/app/admin/actions/settings";

type ShippingItem = { weightGrams: number; widthCm: number; heightCm: number; lengthCm: number; qty: number };

/** Config presente o bastante pra tentar cotar (sem rede ainda) — distingue
 *  "loja não usa cotação real" (cai pro frete fixo em silêncio) de
 *  "configurado mas a chamada falhou" (mostra erro, pede pra tentar de novo). */
function shippingProviderApplicable(shippingConfig: ShippingConfig | null, originCep: string | null): boolean {
  if (!originCep) return false;
  const active = shippingConfig?.activeProvider;
  if (active === "superfrete") {
    const cfg = shippingConfig?.providers?.superfrete;
    return Boolean(cfg?.enabled && cfg.apiToken);
  }
  if (active === "melhorenvio") {
    const cfg = shippingConfig?.providers?.melhorenvio;
    return Boolean(cfg?.enabled && cfg.apiToken);
  }
  return false;
}

/** Dispatcher único: decide qual provider cotar. Só chamar depois de
 *  confirmar shippingProviderApplicable — aqui já assume que tem o que precisa. */
async function getShippingOptions(params: {
  shippingConfig: ShippingConfig | null;
  originCep: string;
  destinationCep: string;
  items: ShippingItem[];
}): Promise<ShippingOption[] | null> {
  const active = params.shippingConfig?.activeProvider;

  if (active === "superfrete") {
    const sfCfg = params.shippingConfig!.providers.superfrete!;
    return quoteShipping({
      sandbox: sfCfg.sandbox,
      apiToken: decryptSecret(sfCfg.apiToken!),
      originCep: params.originCep,
      destinationCep: params.destinationCep,
      items: params.items,
    });
  }

  if (active === "melhorenvio") {
    const meCfg = params.shippingConfig!.providers.melhorenvio!;
    return quoteMelhorEnvio({
      sandbox: meCfg.sandbox,
      apiToken: decryptSecret(meCfg.apiToken!),
      originCep: params.originCep,
      destinationCep: params.destinationCep,
      items: params.items,
    });
  }

  return null;
}

const AddressSchema = z.object({
  cep: z.string().min(1, "Informe o CEP"),
  street: z.string().min(1, "Informe a rua"),
  number: z.string().min(1, "Informe o número"),
  complement: z.string().optional(),
  neighborhood: z.string().min(1, "Informe o bairro"),
  city: z.string().min(1, "Informe a cidade"),
  state: z.string().length(2, "Informe a UF"),
});

const CreateOrderSchema = z.object({
  address: AddressSchema,
  couponCode: z.string().optional(),
  // Só o id do serviço escolhido — nunca o preço, que o servidor recota na hora de confirmar.
  shippingServiceId: z.coerce.number().optional(),
});
export type CreateOrderInput = z.input<typeof CreateOrderSchema>;
export type CreateOrderResult =
  | { ok: true; orderId: string; redirectUrl?: string }
  | { ok: false; error: string };

export type CouponPreviewResult =
  | { ok: true; discountCents: number; freeShipping: boolean }
  | { ok: false; error: string };

/** Erro "esperado" (estoque, cupom inválido, etc.) — mensagem já é segura pro comprador ver. */
class CheckoutError extends Error {}

/** Pré-visualização do cupom no form, antes de finalizar — não consome usedCount. */
export async function previewCouponAction(code: string): Promise<CouponPreviewResult> {
  const session = await auth();
  const result = await withStore(async () => {
    const customer = await currentCustomer(session?.user?.email);
    if (!customer) return { ok: false as const, error: "Entre para aplicar um cupom" };
    const cart = await getCartWithItems(customer.id);
    const v = await validateCoupon(code, cart.totalCents);
    if (!v.ok) return v;
    return { ok: true as const, discountCents: v.discountCents, freeShipping: v.freeShipping };
  });
  return result ?? { ok: false, error: "Loja não encontrada" };
}

export type ShippingPreviewResult =
  | { ok: true; applicable: true; options: ShippingOption[] }
  | { ok: true; applicable: false } // loja não usa SuperFrete — form mantém o frete fixo de hoje
  | { ok: false; error: string };

/** Cotação real no form, antes de finalizar — mesmo padrão de previewCouponAction. */
export async function previewShippingAction(cep: string): Promise<ShippingPreviewResult> {
  const session = await auth();
  const result = await withStore(async (storeId) => {
    const customer = await currentCustomer(session?.user?.email);
    if (!customer) return { ok: false as const, error: "Entre para calcular o frete" };
    const cart = await getCartWithItems(customer.id);
    if (cart.items.length === 0) return { ok: false as const, error: "Carrinho vazio" };

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: { originCep: true, shippingConfig: true },
    });
    const shippingConfig = store?.shippingConfig as ShippingConfig | null;
    const originCep = store?.originCep ?? null;
    if (!shippingProviderApplicable(shippingConfig, originCep)) {
      return { ok: true as const, applicable: false as const };
    }

    const options = await getShippingOptions({
      shippingConfig,
      originCep: originCep!,
      destinationCep: cep,
      items: cart.items.map((i) => ({
        weightGrams: i.product.weightGrams,
        widthCm: i.product.widthCm,
        heightCm: i.product.heightCm,
        lengthCm: i.product.lengthCm,
        qty: i.qty,
      })),
    });
    if (!options || options.length === 0) {
      return { ok: false as const, error: "Não foi possível calcular o frete para este CEP." };
    }
    return { ok: true as const, applicable: true as const, options };
  });
  return result ?? { ok: false, error: "Loja não encontrada" };
}

export async function createOrderAction(input: CreateOrderInput): Promise<CreateOrderResult> {
  const parsed = CreateOrderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const session = await auth();
  if (!session?.user?.email) return { ok: false, error: "Não autenticado" };
  const email = session.user.email;
  const name = session.user.name;

  const result = await withStore(async (storeId) => {
    const customer = await currentCustomer(email);
    if (!customer) return { ok: false as const, error: "Cliente não encontrado" };

    const cart = await getCartWithItems(customer.id);
    if (cart.items.length === 0 || !cart.id) return { ok: false as const, error: "Carrinho vazio" };
    const cartId = cart.id;

    const store = await prisma.store.findUnique({
      where: { id: storeId },
      select: {
        slug: true,
        flatShippingCents: true,
        freeShippingThresholdCents: true,
        paymentConfig: true,
        shippingConfig: true,
        originCep: true,
      },
    });
    if (!store) return { ok: false as const, error: "Loja não encontrada" };

    // Recotação no servidor — o client manda só o serviceId escolhido, nunca
    // o preço. Chamada de rede fica FORA da transação de propósito (mesmo
    // princípio já seguido pro Stripe). Se não achar/falhar, cai pro frete
    // fixo abaixo sem travar o pedido.
    let quotedShippingCents: number | null = null;
    let shippingServiceName: string | undefined;
    let shippingServiceId: number | undefined;
    let shippingProvider: string | undefined;
    const shippingConfig = store.shippingConfig as ShippingConfig | null;
    const originCep = store.originCep;
    if (shippingProviderApplicable(shippingConfig, originCep) && parsed.data.shippingServiceId != null) {
      const options = await getShippingOptions({
        shippingConfig,
        originCep: originCep!,
        destinationCep: parsed.data.address.cep,
        items: cart.items.map((i) => ({
          weightGrams: i.product.weightGrams,
          widthCm: i.product.widthCm,
          heightCm: i.product.heightCm,
          lengthCm: i.product.lengthCm,
          qty: i.qty,
        })),
      });
      const chosen = options?.find((o) => o.serviceId === parsed.data.shippingServiceId);
      if (chosen) {
        quotedShippingCents = chosen.priceCents;
        shippingServiceName = `${chosen.name} — ${chosen.company}`;
        shippingServiceId = chosen.serviceId;
        shippingProvider = shippingConfig!.activeProvider!;
      }
    }

    let txResult;
    try {
      txResult = await prisma.$transaction(async (tx) => {
        let subtotalCents = 0;
        const lines: { productId: string; qty: number; unitPriceCents: number; name: string }[] = [];
        for (const item of cart.items) {
          const product = await tx.product.findUnique({ where: { id: item.productId } });
          if (!product || !product.active) throw new CheckoutError(`"${item.product.name}" não está mais disponível`);
          if (product.stock < item.qty) throw new CheckoutError(`Estoque insuficiente para "${product.name}"`);
          lines.push({ productId: product.id, qty: item.qty, unitPriceCents: product.priceCents, name: product.name });
          subtotalCents += product.priceCents * item.qty;
        }

        // lib/cart.ts já limita addToCart/setItemQty ao estoque do produto
        // (rejeita item com stock=0), então "sem estoque no momento da
        // compra" nunca acontece por este fluxo — madeToOrder fica sempre
        // false até existir uma flag de impressão sob encomenda no produto.
        const madeToOrder = false;

        let discountCents = 0;
        let freeShipping = false;
        let couponId: string | undefined;
        let couponCode: string | undefined;
        let couponType: "percentage" | "fixed" | "free_shipping" | undefined;

        if (parsed.data.couponCode) {
          const v = await validateCoupon(parsed.data.couponCode, subtotalCents, tx);
          if (!v.ok) throw new CheckoutError(v.error);
          const consumed = await consumeCoupon(v.coupon, tx);
          if (!consumed) throw new CheckoutError("Cupom esgotado");
          discountCents = v.discountCents;
          freeShipping = v.freeShipping;
          couponId = v.coupon.id;
          couponCode = v.coupon.code;
          couponType = v.coupon.type;
        }

        // Prioridade: limite de frete grátis > cotação real já feita acima >
        // frete fixo de fallback; cupom free_shipping sempre vence por último.
        const threshold = store.freeShippingThresholdCents;
        const overThreshold = threshold != null && subtotalCents >= threshold;
        let shippingCents: number;
        if (overThreshold) {
          shippingCents = 0;
        } else if (quotedShippingCents != null) {
          shippingCents = quotedShippingCents;
        } else {
          shippingCents = store.flatShippingCents ?? DEFAULT_FLAT_SHIPPING_CENTS;
        }
        if (freeShipping) shippingCents = 0;

        const totalCents = subtotalCents - discountCents + shippingCents;

        // Stripe só entra se for o provider ativo da loja E estiver de fato
        // configurado (chave salva) — qualquer outro caso cai no fluxo manual
        // de hoje (lojista confirma o pagamento em /admin/pedidos).
        const paymentConfig = store.paymentConfig as PaymentConfig | null;
        const stripeCfg = paymentConfig?.providers?.stripe;
        const useStripe = Boolean(
          paymentConfig?.activeProvider === "stripe" && stripeCfg?.enabled && stripeCfg?.secretKey,
        );

        const order = await tx.order.create({
          data: {
            // Explícito (a extensão de tenant também injetaria sozinha em
            // create, mas aqui precisamos do tipo certo pro `include` abaixo
            // funcionar — mesmo princípio de requireStoreId() em lib/cart.ts).
            storeId,
            customerId: customer.id,
            subtotalCents,
            shippingCents,
            shippingServiceName,
            shippingServiceId,
            shippingProvider,
            discountCents,
            totalCents,
            madeToOrder,
            couponId,
            couponCode,
            couponType,
            shippingAddress: { recipient: name ?? customer.name, ...parsed.data.address },
            items: { create: lines.map(({ productId, qty, unitPriceCents }) => ({ productId, qty, unitPriceCents })) },
            payments: { create: { amountCents: totalCents, status: "pending", provider: useStripe ? "stripe" : "manual" } },
          },
          include: { payments: true },
        });

        for (const line of lines) {
          const res = await tx.product.updateMany({
            where: { id: line.productId, stock: { gte: line.qty } },
            data: { stock: { decrement: line.qty } },
          });
          if (res.count === 0) throw new CheckoutError(`Estoque insuficiente para concluir a compra de "${line.name}"`);
        }

        await tx.cartItem.deleteMany({ where: { cartId } });

        return {
          ok: true as const,
          orderId: order.id,
          paymentId: order.payments[0].id,
          totalCents,
          shippingCents,
          discountCents,
          couponCode,
          lines,
          useStripe,
          stripeCfg,
          storeSlug: store.slug,
        };
      });
    } catch (e) {
      if (e instanceof CheckoutError) return { ok: false as const, error: e.message };
      console.error("Falha ao criar pedido:", e);
      return { ok: false as const, error: "Não foi possível concluir o pedido. Tente novamente." };
    }

    if (!txResult.ok) return txResult;
    if (!txResult.useStripe) return { ok: true as const, orderId: txResult.orderId };

    // Chamada de rede fica FORA da transação de propósito — nunca segurar
    // conexão/lock de banco esperando o Stripe responder. O pedido já existe
    // (pending) nesse ponto; se o Stripe falhar aqui, devolvemos erro honesto
    // em vez de mascarar — o pedido fica visível em /admin/pedidos mesmo assim.
    try {
      const stripeClient = stripeClientFromConfig(txResult.stripeCfg)!;
      const base = `/loja/${txResult.storeSlug}`;
      const origin = await baseUrl();

      // Itemizado por produto (mesmo preço já congelado no pedido) + frete
      // como linha própria — a soma bate com totalCents por construção, são
      // os mesmos números só redistribuídos, nada recalculado do zero aqui.
      const lineItems: Array<{
        price_data: { currency: string; unit_amount: number; product_data: { name: string } };
        quantity: number;
      }> = txResult.lines.map((line) => ({
        price_data: { currency: "brl", unit_amount: line.unitPriceCents, product_data: { name: line.name } },
        quantity: line.qty,
      }));
      if (txResult.shippingCents > 0) {
        lineItems.push({
          price_data: { currency: "brl", unit_amount: txResult.shippingCents, product_data: { name: "Frete" } },
          quantity: 1,
        });
      }

      // Desconto do cupom vira um Coupon avulso no Stripe (amount_off fixo,
      // uso único) — é o único jeito de aplicar um abatimento em dinheiro
      // sobre a soma dos itens no Checkout; não dá pra usar linha negativa.
      let discounts: Array<{ coupon: string }> | undefined;
      if (txResult.discountCents > 0) {
        const stripeCoupon = await stripeClient.coupons.create({
          amount_off: txResult.discountCents,
          currency: "brl",
          duration: "once",
          name: txResult.couponCode ?? "Desconto",
        });
        discounts = [{ coupon: stripeCoupon.id }];
      }

      const checkoutSession = await stripeClient.checkout.sessions.create({
        mode: "payment",
        payment_method_types: txResult.stripeCfg?.acceptPix ? ["card", "pix"] : ["card"],
        line_items: lineItems,
        discounts,
        success_url: `${origin}${base}/pedido/${txResult.orderId}`,
        cancel_url: `${origin}${base}/checkout`,
        metadata: { storeId, orderId: txResult.orderId, paymentId: txResult.paymentId },
      });

      await prisma.payment.updateMany({
        where: { id: txResult.paymentId, orderId: txResult.orderId },
        data: { providerPaymentId: checkoutSession.id },
      });

      return { ok: true as const, orderId: txResult.orderId, redirectUrl: checkoutSession.url! };
    } catch (e) {
      console.error("Falha ao criar sessão de pagamento Stripe:", e);
      return {
        ok: false as const,
        error: "Pedido registrado, mas não foi possível abrir o pagamento. Tente novamente ou fale com a loja.",
      };
    }
  });

  if (!result) return { ok: false, error: "Loja não encontrada" };
  if (result.ok) revalidatePath("/loja", "layout");
  return result;
}
