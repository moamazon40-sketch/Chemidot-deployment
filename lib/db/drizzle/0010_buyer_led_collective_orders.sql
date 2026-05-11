CREATE TYPE "public"."collective_order_stage" AS ENUM(
  'gathering',
  'offers_open',
  'offer_selected',
  'allocations_confirming',
  'allocations_locked',
  'supplier_confirmed',
  'admin_review',
  'admin_approved',
  'execution',
  'completed',
  'cancelled'
);--> statement-breakpoint
CREATE TYPE "public"."collective_allocation_confirmation_status" AS ENUM('pending', 'confirmed', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."collective_allocation_invoice_status" AS ENUM('not_issued', 'issued');--> statement-breakpoint
CREATE TYPE "public"."collective_allocation_payment_status" AS ENUM('pending', 'confirmed');--> statement-breakpoint
CREATE TYPE "public"."collective_allocation_fulfillment_status" AS ENUM('processing', 'shipped', 'delivered', 'completed', 'cancelled');--> statement-breakpoint
ALTER TABLE "collective_orders" ALTER COLUMN "supplier_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD COLUMN "created_by_buyer_id" integer;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD COLUMN "collective_stage" "collective_order_stage" DEFAULT 'gathering' NOT NULL;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD COLUMN "target_price" numeric(12, 2);--> statement-breakpoint
ALTER TABLE "collective_orders" ADD COLUMN "recommended_offer_id" integer;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD COLUMN "selected_offer_id" integer;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD COLUMN "is_allocation_locked" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD COLUMN "is_allocation_sharing_approved" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD CONSTRAINT "collective_orders_created_by_buyer_id_users_id_fk" FOREIGN KEY ("created_by_buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE TABLE "collective_order_offers" (
  "id" serial PRIMARY KEY NOT NULL,
  "collective_order_id" integer NOT NULL,
  "supplier_id" integer NOT NULL,
  "unit_price" numeric(12, 2) NOT NULL,
  "currency" text DEFAULT 'SAR' NOT NULL,
  "available_qty" numeric(12, 2) NOT NULL,
  "lead_time" text NOT NULL,
  "incoterms" text[] DEFAULT '{}' NOT NULL,
  "payment_terms" text,
  "delivery_model" text DEFAULT 'to_be_agreed' NOT NULL,
  "delivery_cost_mode" text DEFAULT 'quoted_after_supplier_offer' NOT NULL,
  "valid_until" timestamp,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
CREATE TABLE "collective_order_allocations" (
  "id" serial PRIMARY KEY NOT NULL,
  "collective_order_id" integer NOT NULL,
  "buyer_id" integer NOT NULL,
  "final_qty" numeric(12, 2) NOT NULL,
  "unit_price_snapshot" numeric(12, 2) NOT NULL,
  "subtotal_snapshot" numeric(12, 2) NOT NULL,
  "delivery_city" text,
  "delivery_address" text,
  "contact_name" text,
  "contact_phone" text,
  "contact_email" text,
  "confirmation_status" "collective_allocation_confirmation_status" DEFAULT 'pending' NOT NULL,
  "invoice_status" "collective_allocation_invoice_status" DEFAULT 'not_issued' NOT NULL,
  "payment_status" "collective_allocation_payment_status" DEFAULT 'pending' NOT NULL,
  "fulfillment_status" "collective_allocation_fulfillment_status" DEFAULT 'processing' NOT NULL,
  "proforma_invoice_url" text,
  "commercial_invoice_url" text,
  "confirmed_at" timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint
ALTER TABLE "collective_order_offers" ADD CONSTRAINT "collective_order_offers_collective_order_id_collective_orders_id_fk" FOREIGN KEY ("collective_order_id") REFERENCES "public"."collective_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collective_order_offers" ADD CONSTRAINT "collective_order_offers_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collective_order_allocations" ADD CONSTRAINT "collective_order_allocations_collective_order_id_collective_orders_id_fk" FOREIGN KEY ("collective_order_id") REFERENCES "public"."collective_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collective_order_allocations" ADD CONSTRAINT "collective_order_allocations_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_collective_orders_stage" ON "collective_orders" USING btree ("collective_stage");--> statement-breakpoint
CREATE INDEX "idx_collective_orders_created_by_buyer_id" ON "collective_orders" USING btree ("created_by_buyer_id");--> statement-breakpoint
CREATE INDEX "idx_collective_offers_order_id" ON "collective_order_offers" USING btree ("collective_order_id");--> statement-breakpoint
CREATE INDEX "idx_collective_offers_supplier_id" ON "collective_order_offers" USING btree ("supplier_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_collective_offers_order_supplier" ON "collective_order_offers" USING btree ("collective_order_id", "supplier_id");--> statement-breakpoint
CREATE INDEX "idx_collective_allocations_order_id" ON "collective_order_allocations" USING btree ("collective_order_id");--> statement-breakpoint
CREATE INDEX "idx_collective_allocations_buyer_id" ON "collective_order_allocations" USING btree ("buyer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_collective_allocations_order_buyer" ON "collective_order_allocations" USING btree ("collective_order_id", "buyer_id");
