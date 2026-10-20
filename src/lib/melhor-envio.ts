// lib/melhor-envio.ts — cotação real de frete via Melhor Envio, usando um
// token de acesso pessoal colado pelo lojista (mesmo modelo do SuperFrete:
// token em Store.shippingConfig.providers.melhorenvio, sem OAuth).
//
// Nota: o Melhor Envio também oferece um fluxo OAuth2 completo (client_id/
// client_secret de app + autorização por loja), mas o app de teste cadastrado
// nesta sessão deu "invalid_client" persistente na troca de token — sem
// conseguir diagnosticar a causa raiz sem acesso ao painel deles. O token de
// acesso pessoal (gerado em Permissões de acesso, validade ~1 ano) funcionou
// de primeira e é o mesmo padrão já usado no SuperFrete, então foi o caminho
// adotado. Revisitar OAuth é possível depois, sem afetar o resto da integração.
// Contrato confirmado em docs.melhorenvio.com.br/reference/calculo-de-fretes-por-produtos.
import type { ShippingOption } from "./shipping-types";

function baseUrlFor(sandbox: boolean): string {
  return sandbox ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br";
}

// Exigido pela doc (mesmo espírito do header já usado no SuperFrete).
const USER_AGENT = "Loja3D/1.0 (suporte@loja3d.com.br)";

export async function quoteMelhorEnvio(params: {
  sandbox: boolean;
  apiToken: string; // já decriptado pelo chamador
  originCep: string;
  destinationCep: string;
  items: { weightGrams: number; widthCm: number; heightCm: number; lengthCm: number; qty: number }[];
}): Promise<ShippingOption[] | null> {
  try {
    const res = await fetch(`${baseUrlFor(params.sandbox)}/api/v2/me/shipment/calculate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${params.apiToken}`,
        "User-Agent": USER_AGENT,
      },
      body: JSON.stringify({
        from: { postal_code: params.originCep.replace(/\D/g, "") },
        to: { postal_code: params.destinationCep.replace(/\D/g, "") },
        products: params.items.map((i, idx) => ({
          id: String(idx),
          width: Math.round(i.widthCm),
          height: Math.round(i.heightCm),
          length: Math.round(i.lengthCm),
          weight: i.weightGrams / 1000,
          quantity: i.qty,
        })),
      }),
    });
    if (!res.ok) {
      console.error("Melhor Envio: cotação falhou", res.status, await res.text());
      return null;
    }
    const data = (await res.json()) as Array<{
      id: number;
      name: string;
      custom_price?: string;
      price?: string;
      custom_delivery_time?: number;
      delivery_time?: number;
      company?: { name?: string };
      error?: string;
    }>;
    return data
      .filter((d) => !d.error && (d.custom_price ?? d.price))
      .map((d) => ({
        serviceId: d.id,
        name: d.name,
        company: d.company?.name ?? "",
        priceCents: Math.round(Number(d.custom_price ?? d.price) * 100),
        deliveryDays: d.custom_delivery_time ?? d.delivery_time ?? 0,
      }))
      .sort((a, b) => a.priceCents - b.priceCents);
  } catch (e) {
    console.error("Melhor Envio: erro na cotação", e);
    return null;
  }
}
