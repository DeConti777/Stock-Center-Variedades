-- AlterTable
ALTER TABLE "Order" ADD COLUMN "mercadoPagoPaymentId" TEXT;

-- AlterTable
ALTER TABLE "PaymentAttempt" ADD COLUMN "mercadoPagoPaymentId" TEXT;
