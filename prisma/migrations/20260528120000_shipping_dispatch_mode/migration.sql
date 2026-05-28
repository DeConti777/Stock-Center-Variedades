-- AlterTable
ALTER TABLE "Order" ADD COLUMN "shippingDispatchMode" TEXT NOT NULL DEFAULT 'PENDING';
ALTER TABLE "Order" ADD COLUMN "shippingQuotedDeliveryDays" INTEGER;
