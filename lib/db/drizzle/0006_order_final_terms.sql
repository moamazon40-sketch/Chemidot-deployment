ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_unit_price" numeric(14, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_quantity" numeric(12, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_lead_time" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "confirmed_incoterm" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_terms" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "offer_validity_date" timestamp;
