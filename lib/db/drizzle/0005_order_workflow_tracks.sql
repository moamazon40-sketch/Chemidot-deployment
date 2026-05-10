DO $$ BEGIN
  CREATE TYPE "deal_stage" AS ENUM (
    'buyer_accepted',
    'supplier_confirmed',
    'admin_needs_review',
    'admin_approved',
    'buyer_confirmed',
    'invoice_issued',
    'closed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "payment_status" AS ENUM ('not_started', 'pending', 'confirmed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "fulfillment_status" AS ENUM (
    'not_started',
    'preparing',
    'ready_for_pickup',
    'shipped',
    'delivered',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "deal_stage" "deal_stage";
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "payment_status" "payment_status" NOT NULL DEFAULT 'not_started';
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "fulfillment_status" "fulfillment_status" NOT NULL DEFAULT 'not_started';
