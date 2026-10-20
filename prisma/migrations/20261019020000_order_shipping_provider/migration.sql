-- AlterTable: qual API cotou de verdade (desambigua shippingServiceId entre providers).
ALTER TABLE "Order" ADD COLUMN "shippingProvider" TEXT;
