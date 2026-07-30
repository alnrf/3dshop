// app/admin/actions/settings.ts — configuração de pagamento e frete por loja.
// Guarda só as credenciais (Store.paymentConfig / shippingConfig); não há, ainda,
// integração real com os gateways/transportadoras — isso fica para depois.
"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireStoreAccess, getActiveStoreId } from "@/lib/tenant";
import { encryptSecret } from "@/lib/crypto";

// ─── Pagamento ────────────────────────────────────────────────────────────────

type PaymentConfig = {
  activeProvider: "stripe" | "pagseguro" | "mercadopago" | null;
  providers: {
    stripe?: { enabled: boolean; acceptPix: boolean; publishableKey?: string; secretKey?: string };
    pagseguro?: { enabled: boolean; acceptPix: boolean; token?: string };
    mercadopago?: { enabled: boolean; acceptPix: boolean; accessToken?: string };
  };
};

const ProviderFieldSchema = z.object({
  enabled: z.boolean(),
  acceptPix: z.boolean(),
  value: z.string().optional(), // campo secreto (ou publishableKey do Stripe): "" ou ausente = manter
  clear: z.boolean().optional(), // limpar o campo secreto explicitamente
});

const PaymentSettingsSchema = z.object({
  activeProvider: z.enum(["stripe", "pagseguro", "mercadopago"]).nullable(),
  stripe: ProviderFieldSchema.extend({ publishableKey: z.string().optional() }),
  pagseguro: ProviderFieldSchema,
  mercadopago: ProviderFieldSchema,
});
export type PaymentSettingsInput = z.input<typeof PaymentSettingsSchema>;

/** Mantém o segredo existente quando o campo vem vazio; troca quando vem preenchido; limpa se `clear`. */
function resolveSecret(existing: string | undefined, incoming?: string, clear?: boolean) {
  if (incoming) return encryptSecret(incoming);
  if (clear) return undefined;
  return existing;
}

async function loadStoreConfigs(storeId: string) {
  const store = await prisma.store.findUnique({
    where: { id: storeId },
    select: { paymentConfig: true, shippingConfig: true },
  });
  return {
    payment: (store?.paymentConfig as PaymentConfig | null) ?? { activeProvider: null, providers: {} },
    shipping: (store?.shippingConfig as ShippingConfig | null) ?? { activeProvider: null, providers: {} },
  };
}

export async function getPaymentSettingsAction() {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const { payment } = await loadStoreConfigs(storeId);
  const p = payment.providers;
  return {
    activeProvider: payment.activeProvider,
    stripe: {
      enabled: p.stripe?.enabled ?? false,
      acceptPix: p.stripe?.acceptPix ?? false,
      publishableKey: p.stripe?.publishableKey ?? "",
      secretKeyConfigured: Boolean(p.stripe?.secretKey),
    },
    pagseguro: {
      enabled: p.pagseguro?.enabled ?? false,
      acceptPix: p.pagseguro?.acceptPix ?? false,
      tokenConfigured: Boolean(p.pagseguro?.token),
    },
    mercadopago: {
      enabled: p.mercadopago?.enabled ?? false,
      acceptPix: p.mercadopago?.acceptPix ?? false,
      accessTokenConfigured: Boolean(p.mercadopago?.accessToken),
    },
  };
}

export type PaymentSettingsResult = { ok: true } | { ok: false; error: string };

export async function savePaymentSettingsAction(input: PaymentSettingsInput): Promise<PaymentSettingsResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  const parsed = PaymentSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const data = parsed.data;

  const { payment: existing } = await loadStoreConfigs(storeId);
  const ex = existing.providers;

  const next: PaymentConfig = {
    activeProvider: data.activeProvider,
    providers: {
      stripe: {
        enabled: data.stripe.enabled,
        acceptPix: data.stripe.acceptPix,
        publishableKey: data.stripe.publishableKey || ex.stripe?.publishableKey,
        secretKey: resolveSecret(ex.stripe?.secretKey, data.stripe.value, data.stripe.clear),
      },
      pagseguro: {
        enabled: data.pagseguro.enabled,
        acceptPix: data.pagseguro.acceptPix,
        token: resolveSecret(ex.pagseguro?.token, data.pagseguro.value, data.pagseguro.clear),
      },
      mercadopago: {
        enabled: data.mercadopago.enabled,
        acceptPix: data.mercadopago.acceptPix,
        accessToken: resolveSecret(ex.mercadopago?.accessToken, data.mercadopago.value, data.mercadopago.clear),
      },
    },
  };

  await prisma.store.update({ where: { id: storeId }, data: { paymentConfig: next } });
  revalidatePath("/admin/configuracoes/pagamentos");
  return { ok: true };
}

// ─── Frete ────────────────────────────────────────────────────────────────────

type ShippingConfig = {
  activeProvider: "superfrete" | "melhorenvio" | null;
  providers: {
    superfrete?: { enabled: boolean; sandbox: boolean; apiToken?: string };
    melhorenvio?: { enabled: boolean; sandbox: boolean; apiToken?: string };
  };
};

const ShippingProviderSchema = z.object({
  enabled: z.boolean(),
  sandbox: z.boolean(),
  value: z.string().optional(),
  clear: z.boolean().optional(),
});

const ShippingSettingsSchema = z.object({
  activeProvider: z.enum(["superfrete", "melhorenvio"]).nullable(),
  superfrete: ShippingProviderSchema,
  melhorenvio: ShippingProviderSchema,
});
export type ShippingSettingsInput = z.input<typeof ShippingSettingsSchema>;

export async function getShippingSettingsAction() {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);
  const { shipping } = await loadStoreConfigs(storeId);
  const p = shipping.providers;
  return {
    activeProvider: shipping.activeProvider,
    superfrete: {
      enabled: p.superfrete?.enabled ?? false,
      sandbox: p.superfrete?.sandbox ?? false,
      apiTokenConfigured: Boolean(p.superfrete?.apiToken),
    },
    melhorenvio: {
      enabled: p.melhorenvio?.enabled ?? false,
      sandbox: p.melhorenvio?.sandbox ?? false,
      apiTokenConfigured: Boolean(p.melhorenvio?.apiToken),
    },
  };
}

export type ShippingSettingsResult = { ok: true } | { ok: false; error: string };

export async function saveShippingSettingsAction(input: ShippingSettingsInput): Promise<ShippingSettingsResult> {
  const storeId = await getActiveStoreId();
  await requireStoreAccess(storeId);

  const parsed = ShippingSettingsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const data = parsed.data;

  const { shipping: existing } = await loadStoreConfigs(storeId);
  const ex = existing.providers;

  const next: ShippingConfig = {
    activeProvider: data.activeProvider,
    providers: {
      superfrete: {
        enabled: data.superfrete.enabled,
        sandbox: data.superfrete.sandbox,
        apiToken: resolveSecret(ex.superfrete?.apiToken, data.superfrete.value, data.superfrete.clear),
      },
      melhorenvio: {
        enabled: data.melhorenvio.enabled,
        sandbox: data.melhorenvio.sandbox,
        apiToken: resolveSecret(ex.melhorenvio?.apiToken, data.melhorenvio.value, data.melhorenvio.clear),
      },
    },
  };

  await prisma.store.update({ where: { id: storeId }, data: { shippingConfig: next } });
  revalidatePath("/admin/configuracoes/frete");
  return { ok: true };
}
