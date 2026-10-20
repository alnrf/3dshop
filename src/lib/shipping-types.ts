// lib/shipping-types.ts — tipo compartilhado entre os providers de frete
// (SuperFrete, Melhor Envio, ...) pra quem consome cotação não precisar
// saber qual API respondeu.
export type ShippingOption = {
  serviceId: number;
  name: string;
  company: string;
  priceCents: number;
  deliveryDays: number;
};
