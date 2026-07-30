/*
  Warnings:

  - You are about to drop the column `melhorEnvioOrderId` on the `Order` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Order" DROP COLUMN "melhorEnvioOrderId",
ADD COLUMN     "shippingProviderOrderId" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "shippingConfig" JSONB;
