ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "proforma_invoice_url" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "commercial_invoice_url" text;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "order_document_notes" text;
