-- AlterTable
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "melhorEnvioServiceId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "melhorEnvioShipmentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "melhorEnvioStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "melhorEnvioError" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Order_melhorEnvioShipmentId_key" ON "Order"("melhorEnvioShipmentId");
