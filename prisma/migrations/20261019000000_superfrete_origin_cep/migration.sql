-- AlterTable: CEP de origem da loja, necessário pra cotação real de frete (SuperFrete).
ALTER TABLE "Store" ADD COLUMN "originCep" TEXT;

-- AlterTable: serviço/transportadora escolhido na cotação real, só informativo.
ALTER TABLE "Order" ADD COLUMN "shippingServiceName" TEXT;
