-- AlterTable: id numérico do serviço (necessário pra comprar etiqueta) e URL do PDF gerado.
ALTER TABLE "Order" ADD COLUMN "shippingServiceId" INTEGER;
ALTER TABLE "Order" ADD COLUMN "shippingLabelUrl" TEXT;

-- AlterTable: resto do endereço de remetente, necessário só pra gerar etiqueta de verdade.
ALTER TABLE "Store" ADD COLUMN "originAddress" JSONB;
