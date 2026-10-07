// lib/payment-methods.ts — forma de pagamento informada na confirmação manual
// (controle do lojista, sem gateway real ainda). Constantes puras: um arquivo
// "use server" só pode exportar funções async, por isso ficam fora de orders.ts.
export const MANUAL_PAYMENT_METHODS = ["pix", "cartao", "dinheiro"] as const;
export type ManualPaymentMethod = (typeof MANUAL_PAYMENT_METHODS)[number];

export const MANUAL_PAYMENT_METHOD_LABEL: Record<ManualPaymentMethod, string> = {
  pix: "Pix",
  cartao: "Cartão",
  dinheiro: "Dinheiro",
};
