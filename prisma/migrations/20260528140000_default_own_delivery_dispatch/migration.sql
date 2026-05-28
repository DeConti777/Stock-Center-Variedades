UPDATE "Order" SET "shippingDispatchMode" = 'OWN_DELIVERY' WHERE "shippingDispatchMode" = 'PENDING';

ALTER TABLE "Order" ALTER COLUMN "shippingDispatchMode" SET DEFAULT 'OWN_DELIVERY';
