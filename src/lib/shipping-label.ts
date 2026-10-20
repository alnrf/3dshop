// lib/shipping-label.ts — orquestra a compra de etiqueta real (SuperFrete):
// empacota os itens do pedido numa caixa única, cria a etiqueta (pending) e
// paga com o saldo da carteira, salvando tracking + PDF no pedido.
import { prisma } from "./prisma";
import { decryptSecret } from "./crypto";
import { createShippingCart, payShippingCart, type OriginAddress } from "./superfrete";
import type { ShippingConfig } from "@/app/admin/actions/settings";

export type GenerateLabelResult = { ok: true; trackingCode: string; labelUrl: string } | { ok: false; error: string };

type OrderAddress = {
  recipient?: string;
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
};

export async function generateShippingLabel(orderId: string, storeId: string): Promise<GenerateLabelResult> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!order) return { ok: false, error: "Pedido não encontrado" };

  // Idempotente: já gerada antes, não compra de novo (evitaria cobrar duas vezes da carteira).
  if (order.trackingCode) {
    return { ok: true, trackingCode: order.trackingCode, labelUrl: order.shippingLabelUrl ?? "" };
  }
  if (order.paymentStatus !== "approved") {
    return { ok: false, error: "Só é possível gerar etiqueta de pedido pago." };
  }
  if (!order.shippingServiceId) {
    return { ok: false, error: "Este pedido não usou cotação real de frete." };
  }
  if (!order.customer.cpf) {
    return { ok: false, error: "Cliente sem CPF cadastrado — peça pra preencher o perfil antes de gerar a etiqueta." };
  }

  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { name: true, originCep: true, originAddress: true, shippingConfig: true },
  });
  const originAddr = store?.originAddress as OriginAddress | null;
  if (!store?.originCep || !originAddr?.street || !originAddr.district || !originAddr.city || !originAddr.stateAbbr) {
    return { ok: false, error: "Endereço de origem da loja incompleto — preencha em Configurações → Frete." };
  }
  const sfCfg = (store.shippingConfig as ShippingConfig | null)?.providers?.superfrete;
  if (!sfCfg?.apiToken) return { ok: false, error: "SuperFrete não está configurado para esta loja." };
  const apiToken = decryptSecret(sfCfg.apiToken);

  // Empacotamento consolidado por empilhamento (confirmado com o usuário):
  // peso e comprimento somam, largura/altura usam o maior item — tende a
  // superestimar a caixa em vez de arriscar uma caixa pequena demais.
  let weight = 0;
  let length = 0;
  let width = 0;
  let height = 0;
  for (const item of order.items) {
    weight += (item.product.weightGrams / 1000) * item.qty;
    length += item.product.lengthCm * item.qty;
    width = Math.max(width, item.product.widthCm);
    height = Math.max(height, item.product.heightCm);
  }

  const addr = order.shippingAddress as OrderAddress;

  const cart = await createShippingCart({
    sandbox: sfCfg.sandbox,
    apiToken,
    platform: "Loja3D",
    storeName: store.name,
    originCep: store.originCep,
    origin: originAddr,
    destination: {
      name: addr.recipient ?? order.customer.name,
      document: order.customer.cpf,
      phone: order.customer.phone ?? undefined,
      street: addr.street ?? "",
      number: addr.number,
      complement: addr.complement,
      district: addr.neighborhood ?? "",
      city: addr.city ?? "",
      stateAbbr: addr.state ?? "",
      postalCep: addr.cep ?? "",
    },
    service: order.shippingServiceId,
    volumes: { height, width, length, weight },
    products: order.items.map((i) => ({
      name: i.product.name,
      quantity: String(i.qty),
      unitary_value: (i.unitPriceCents / 100).toFixed(2),
    })),
  });
  if (!cart) return { ok: false, error: "Não foi possível criar o frete na SuperFrete. Confira a configuração." };

  const paid = await payShippingCart({ sandbox: sfCfg.sandbox, apiToken, cartId: cart.id });
  if (!paid) {
    return {
      ok: false,
      error: "Frete criado, mas o pagamento falhou — confira o saldo da carteira SuperFrete e tente de novo.",
    };
  }

  await prisma.order.updateMany({
    where: { id: orderId, storeId },
    data: { trackingCode: paid.trackingCode, shippingProviderOrderId: cart.id, shippingLabelUrl: paid.labelUrl },
  });

  return { ok: true, trackingCode: paid.trackingCode, labelUrl: paid.labelUrl };
}
