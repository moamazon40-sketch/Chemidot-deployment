DO $$ BEGIN
  CREATE TYPE "invoice_status" AS ENUM ('not_issued', 'issued');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_issued_at" timestamp;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "invoice_status" "invoice_status" NOT NULL DEFAULT 'not_issued';

UPDATE "orders"
SET
  "invoice_status" = 'issued',
  "invoice_issued_at" = COALESCE("invoice_issued_at", "updated_at")
WHERE "proforma_invoice_url" IS NOT NULL
  AND "proforma_invoice_url" <> '';
