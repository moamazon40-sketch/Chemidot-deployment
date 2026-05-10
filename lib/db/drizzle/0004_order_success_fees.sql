ALTER TYPE "order_status" ADD VALUE IF NOT EXISTS 'completed';

DO $$ BEGIN
  CREATE TYPE "success_fee_status" AS ENUM ('pending', 'invoiced', 'paid', 'waived');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "success_fee_payer" AS ENUM ('supplier');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deal_value" numeric(14, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deal_currency" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "success_fee_rate" numeric(5, 4) NOT NULL DEFAULT '0.0200';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "success_fee_amount" numeric(14, 2);
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "success_fee_payer" "success_fee_payer" NOT NULL DEFAULT 'supplier';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "success_fee_status" "success_fee_status";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "success_fee_notes" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "success_fee_marked_at" timestamp;
