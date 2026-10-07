-- AlterTable: forma de pagamento informada na confirmação manual (pix/cartao/
-- dinheiro) — controle do lojista enquanto não há gateway real integrado.
ALTER TABLE "Payment" ADD COLUMN "method" TEXT;
