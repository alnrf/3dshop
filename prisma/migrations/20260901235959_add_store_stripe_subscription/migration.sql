-- AlterTable
ALTER TABLE "Store" ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ADD COLUMN     "subscriptionStatus" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Store_stripeCustomerId_key" ON "Store"("stripeCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "Store_stripeSubscriptionId_key" ON "Store"("stripeSubscriptionId");
