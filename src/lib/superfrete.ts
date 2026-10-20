// lib/superfrete.ts — cotação real de frete via SuperFrete, usando a própria
// conta do lojista (token em Store.shippingConfig.providers.superfrete).
// Contrato confirmado em https://superfrete.readme.io/reference/cotacao-de-frete
// (não documentado em detalhe na página inicial da API).
import type { ShippingOption } from "./shipping-types";
export type { ShippingOption };

function onlyDigits(s: string): string {
  return s.replace(/\D/g, "");
}

function baseUrlFor(sandbox: boolean): string {
  return sandbox ? "https://sandbox.superfrete.com" : "https://api.superfrete.com";
}

// Exigido pela SuperFrete (rejeita sem isso) — identifica a integração pro
// suporte técnico deles, não aparece pro comprador.
const USER_AGENT = "Loja3D/1.0 (suporte@loja3d.com.br)";

export async function quoteShipping(params: {
  sandbox: boolean;
  apiToken: string; // já decriptado pelo chamador
  originCep: string;
  destinationCep: string;
  items: { weightGrams: number; widthCm: number; heightCm: number; lengthCm: number; qty: number }[];
}): Promise<ShippingOption[] | null> {
  const base = baseUrlFor(params.sandbox);

  try {
    const res = await fetch(`${base}/api/v0/calculator`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiToken}`,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        from: { postal_code: onlyDigits(params.originCep) },
        to: { postal_code: onlyDigits(params.destinationCep) },
        // SuperFrete faz o empacotamento a partir dos produtos individuais —
        // não precisamos de heurística de caixa única.
        products: params.items.map((i) => ({
          quantity: i.qty,
          height: i.heightCm,
          width: i.widthCm,
          length: i.lengthCm,
          weight: i.weightGrams / 1000, // API espera kg; produto guarda em gramas
        })),
        services: "1,2,3,17,31,33", // PAC, Sedex, Jadlog, Mini Envios, Loggi, J&T
      }),
    });

    if (!res.ok) {
      console.error("SuperFrete: cotação falhou", res.status, await res.text());
      return null;
    }

    const data = (await res.json()) as Array<{
      id: number;
      name: string;
      price: number;
      delivery_time: number;
      company?: { name?: string };
      has_error?: boolean;
    }>;

    return data
      .filter((d) => !d.has_error)
      .map((d) => ({
        serviceId: d.id,
        name: d.name,
        company: d.company?.name ?? "",
        priceCents: Math.round(Number(d.price) * 100),
        deliveryDays: d.delivery_time,
      }))
      .sort((a, b) => a.priceCents - b.priceCents);
  } catch (e) {
    console.error("SuperFrete: erro na cotação", e);
    return null;
  }
}

// ─── Compra de etiqueta ─────────────────────────────────────────────────────
// Contrato confirmado em https://superfrete.readme.io/reference/adicionar-frete-carrinho
// e https://superfrete.readme.io/reference/apiintegrationv1checkout — nenhum
// dos dois aparece na página inicial da API, só nessas páginas específicas.

export type OriginAddress = {
  street: string;
  number?: string;
  complement?: string;
  district: string;
  city: string;
  stateAbbr: string;
  phone?: string;
  document?: string;
};

export type DestinationAddress = {
  name: string;
  document: string; // CPF/CNPJ — obrigatório pela SuperFrete pra gerar etiqueta
  phone?: string;
  street: string;
  number?: string;
  complement?: string;
  district: string;
  city: string;
  stateAbbr: string;
  postalCep: string;
};

export type CartLabel = { id: string; priceCents: number; status: string };

/** POST /api/v0/cart — cria a etiqueta como "pending" (ainda não paga). */
export async function createShippingCart(params: {
  sandbox: boolean;
  apiToken: string;
  platform: string;
  storeName: string;
  originCep: string;
  origin: OriginAddress;
  destination: DestinationAddress;
  service: number;
  volumes: { height: number; width: number; length: number; weight: number }; // cm e kg
  products: { name: string; quantity: string; unitary_value: string }[];
}): Promise<CartLabel | null> {
  const base = baseUrlFor(params.sandbox);
  try {
    const res = await fetch(`${base}/api/v0/cart`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiToken}`,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        from: {
          name: params.storeName,
          address: params.origin.street,
          number: params.origin.number ?? "",
          complement: params.origin.complement ?? "",
          district: params.origin.district,
          city: params.origin.city,
          state_abbr: params.origin.stateAbbr,
          postal_code: onlyDigits(params.originCep),
          document: params.origin.document ?? "",
          phone: params.origin.phone ?? "",
        },
        to: {
          name: params.destination.name,
          address: params.destination.street,
          number: params.destination.number ?? "",
          complement: params.destination.complement ?? "",
          district: params.destination.district,
          city: params.destination.city,
          state_abbr: params.destination.stateAbbr,
          postal_code: onlyDigits(params.destination.postalCep),
          document: onlyDigits(params.destination.document),
          phone: params.destination.phone ?? "",
        },
        service: params.service,
        volumes: params.volumes,
        products: params.products,
        options: { invoice: { number: "" } },
        platform: params.platform,
      }),
    });
    if (!res.ok) {
      console.error("SuperFrete: criação de etiqueta falhou", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { id: string; price: number; status: string };
    return { id: data.id, priceCents: Math.round(Number(data.price) * 100), status: data.status };
  } catch (e) {
    console.error("SuperFrete: erro ao criar etiqueta", e);
    return null;
  }
}

export type PaidLabel = { trackingCode: string; labelUrl: string; priceCents: number };

/** POST /api/v0/checkout — paga com o saldo da carteira SuperFrete da loja. */
export async function payShippingCart(params: {
  sandbox: boolean;
  apiToken: string;
  cartId: string;
}): Promise<PaidLabel | null> {
  const base = baseUrlFor(params.sandbox);
  try {
    const res = await fetch(`${base}/api/v0/checkout`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiToken}`,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ orders: [params.cartId] }),
    });
    if (!res.ok) {
      console.error("SuperFrete: pagamento da etiqueta falhou", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as {
      success: boolean;
      purchase?: { orders: { tracking: string; price: number; print: { url: string } }[] };
    };
    const order = data.purchase?.orders?.[0];
    if (!data.success || !order) return null;
    return { trackingCode: order.tracking, labelUrl: order.print.url, priceCents: Math.round(Number(order.price) * 100) };
  } catch (e) {
    console.error("SuperFrete: erro ao pagar etiqueta", e);
    return null;
  }
}

/**
 * POST /api/v0/tag/print — gera um link NOVO pro PDF de uma etiqueta já
 * comprada. O link devolvido no momento da compra (payShippingCart) pode ser
 * uma URL assinada de validade curta; pra reabrir depois, busca um link
 * fresco aqui em vez de confiar numa cópia guardada.
 */
export async function fetchLabelPrintUrl(params: {
  sandbox: boolean;
  apiToken: string;
  providerOrderId: string; // Order.shippingProviderOrderId — id do lado da SuperFrete
}): Promise<string | null> {
  const base = baseUrlFor(params.sandbox);
  try {
    const res = await fetch(`${base}/api/v0/tag/print`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${params.apiToken}`,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({ orders: [params.providerOrderId] }),
    });
    if (!res.ok) {
      console.error("SuperFrete: busca do link da etiqueta falhou", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as { url: string };
    return data.url;
  } catch (e) {
    console.error("SuperFrete: erro ao buscar link da etiqueta", e);
    return null;
  }
}
