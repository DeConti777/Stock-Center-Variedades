-- Medidas da embalagem fechada por SKU (cotacao e etiqueta Melhor Envio).
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packageWidthCm" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packageHeightCm" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packageLengthCm" INTEGER;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "packageWeightKg" DOUBLE PRECISION;
