DO $$ BEGIN
 CREATE TYPE "supplier_plan" AS ENUM('trial', 'starter', 'growth', 'enterprise');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "subscription_status" AS ENUM('trial', 'active', 'past_due', 'suspended', 'cancelled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
 CREATE TYPE "billing_cycle" AS ENUM('monthly', 'yearly', 'custom');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "supplier_plan" "supplier_plan" DEFAULT 'trial' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "subscription_status" "subscription_status" DEFAULT 'trial' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "trial_ends_at" timestamp;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "grace_period_ends_at" timestamp;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "subscription_started_at" timestamp;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "subscription_renewal_date" timestamp;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "billing_cycle" "billing_cycle" DEFAULT 'monthly' NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "internal_admin_notes" text;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "featured_supplier" boolean DEFAULT false NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "product_limit" integer DEFAULT 3;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "rfq_access_enabled" boolean DEFAULT true NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "storefront_visible" boolean DEFAULT true NOT NULL;
ALTER TABLE "suppliers" ADD COLUMN IF NOT EXISTS "products_public" boolean DEFAULT true NOT NULL;

UPDATE "suppliers"
SET
  "supplier_plan" = COALESCE("supplier_plan", 'trial'),
  "subscription_status" = COALESCE("subscription_status", 'trial'),
  "billing_cycle" = COALESCE("billing_cycle", 'monthly'),
  "featured_supplier" = COALESCE("featured_supplier", false),
  "product_limit" = COALESCE("product_limit", 3),
  "rfq_access_enabled" = COALESCE("rfq_access_enabled", true),
  "storefront_visible" = COALESCE("storefront_visible", true),
  "products_public" = COALESCE("products_public", true),
  "trial_ends_at" = COALESCE("trial_ends_at", NOW() + interval '14 days'),
  "subscription_started_at" = COALESCE("subscription_started_at", NOW());

CREATE TABLE IF NOT EXISTS "admin_audit_logs" (
  "id" serial PRIMARY KEY NOT NULL,
  "admin_user_id" integer NOT NULL REFERENCES "users"("id"),
  "supplier_id" integer REFERENCES "suppliers"("id"),
  "action" text NOT NULL,
  "details_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_suppliers_supplier_plan" ON "suppliers" ("supplier_plan");
CREATE INDEX IF NOT EXISTS "idx_suppliers_subscription_status" ON "suppliers" ("subscription_status");
CREATE INDEX IF NOT EXISTS "idx_suppliers_storefront_visible" ON "suppliers" ("storefront_visible");
CREATE INDEX IF NOT EXISTS "idx_suppliers_products_public" ON "suppliers" ("products_public");
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_admin_user_id" ON "admin_audit_logs" ("admin_user_id");
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_supplier_id" ON "admin_audit_logs" ("supplier_id");
CREATE INDEX IF NOT EXISTS "idx_admin_audit_logs_action" ON "admin_audit_logs" ("action");
