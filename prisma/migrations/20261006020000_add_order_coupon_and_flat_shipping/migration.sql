-- AlterTable: Order ganha snapshot do cupom aplicado (se houver) e o desconto
-- congelado no momento da compra. couponId é FK opcional com SetNull: se o
-- lojista excluir o cupom depois (deleteCouponFormAction não tem guarda hoje),
-- o pedido não quebra, só perde o vínculo navegável — couponCode/couponType/
-- discountCents continuam contando a história real da compra (mesmo
-- princípio de OrderItem.unitPriceCents).
ALTER TABLE "Order" ADD COLUMN "couponId" TEXT;
ALTER TABLE "Order" ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" ADD COLUMN "couponType" "CouponType";
ALTER TABLE "Order" ADD COLUMN "discountCents" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE INDEX "Order_couponId_idx" ON "Order"("couponId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AlterTable: frete fixo configurável por loja (fase atual: sem cotação real
-- de transportadora — Store.shippingConfig continua reservado pra quando
-- isso existir). Null = lojista ainda não configurou.
ALTER TABLE "Store" ADD COLUMN "flatShippingCents" INTEGER;
ALTER TABLE "Store" ADD COLUMN "freeShippingThresholdCents" INTEGER;
