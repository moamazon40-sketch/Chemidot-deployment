CREATE TYPE "public"."user_role" AS ENUM('buyer', 'supplier', 'admin');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('active', 'suspended', 'pending_verification');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('in_stock', 'limited', 'out_of_stock');--> statement-breakpoint
CREATE TYPE "public"."rfq_status" AS ENUM('pending', 'active', 'closed', 'awarded');--> statement-breakpoint
CREATE TYPE "public"."quotation_status" AS ENUM('pending', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."collective_order_status" AS ENUM('open', 'closing_soon', 'closed', 'fulfilled');--> statement-breakpoint
CREATE TYPE "public"."order_status" AS ENUM('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('rfq_update', 'new_quotation', 'order_update', 'collective_milestone', 'payment_reminder', 'system');--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "user_role" DEFAULT 'buyer' NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"company_name" text NOT NULL,
	"industry" text,
	"country" text NOT NULL,
	"phone" text,
	"avatar_url" text,
	"status" "user_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "suppliers" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"company_name" text NOT NULL,
	"logo_url" text,
	"cover_url" text,
	"description" text,
	"country" text NOT NULL,
	"warehouse_location" text,
	"commercial_reg_number" text,
	"certifications" text[] DEFAULT '{}' NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"response_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"avg_response_time" text DEFAULT '24 hours' NOT NULL,
	"years_in_business" integer,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"name_ar" text NOT NULL,
	"slug" text NOT NULL,
	"icon_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"category_id" integer NOT NULL,
	"name" text NOT NULL,
	"cas_number" text,
	"description" text NOT NULL,
	"image_url" text,
	"images" text[] DEFAULT '{}' NOT NULL,
	"moq" numeric(12, 2) NOT NULL,
	"moq_unit" text DEFAULT 'ton' NOT NULL,
	"base_price" numeric(12, 2),
	"currency" text DEFAULT 'USD' NOT NULL,
	"availability" "availability_status" DEFAULT 'in_stock' NOT NULL,
	"delivery_lead_time" text DEFAULT '2-4 weeks' NOT NULL,
	"collective_eligible" boolean DEFAULT false NOT NULL,
	"country_of_origin" text NOT NULL,
	"packaging" text,
	"sds_document_url" text,
	"technical_specs" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"pricing_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"applications" text[] DEFAULT '{}' NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rfqs" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"category_id" integer,
	"product_name" text NOT NULL,
	"cas_number" text,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" text NOT NULL,
	"delivery_destination" text NOT NULL,
	"delivery_deadline" timestamp NOT NULL,
	"description" text,
	"specifications" text,
	"status" "rfq_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotations" (
	"id" serial PRIMARY KEY NOT NULL,
	"rfq_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"price_per_unit" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"delivery_time" text NOT NULL,
	"valid_until" timestamp NOT NULL,
	"notes" text,
	"status" "quotation_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collective_order_participants" (
	"id" serial PRIMARY KEY NOT NULL,
	"collective_order_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"quantity" numeric(12, 2) NOT NULL,
	"delivery_destination" text NOT NULL,
	"payment_terms" text,
	"joined_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "collective_orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"target_quantity" numeric(12, 2) NOT NULL,
	"current_quantity" numeric(12, 2) DEFAULT '0' NOT NULL,
	"unit" text NOT NULL,
	"base_price" numeric(12, 2) NOT NULL,
	"current_price" numeric(12, 2) NOT NULL,
	"pricing_tiers" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"status" "collective_order_status" DEFAULT 'open' NOT NULL,
	"deadline" timestamp NOT NULL,
	"delivery_region" text NOT NULL,
	"moq_per_participant" numeric(12, 2) NOT NULL,
	"packaging_options" text[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"product_id" integer,
	"rfq_id" integer,
	"quotation_id" integer,
	"product_name" text,
	"quantity" numeric(12, 2) NOT NULL,
	"unit" text NOT NULL,
	"total_price" numeric(14, 2) NOT NULL,
	"currency" text DEFAULT 'USD' NOT NULL,
	"status" "order_status" DEFAULT 'pending' NOT NULL,
	"tracking_number" text,
	"estimated_delivery" timestamp,
	"delivery_address" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"buyer_id" integer NOT NULL,
	"supplier_id" integer NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"content" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" text NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"related_id" integer,
	"related_type" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"product_id" integer NOT NULL,
	"buyer_id" integer NOT NULL,
	"rating" integer NOT NULL,
	"comment" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_brands" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"name" text NOT NULL,
	"logo_url" text,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"title" text NOT NULL,
	"type" text NOT NULL,
	"file_url" text NOT NULL,
	"file_size" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_experts" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplier_id" integer NOT NULL,
	"name" text NOT NULL,
	"title" text NOT NULL,
	"email" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"slug" text NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"hero_image_url" text,
	"industry_tags" text[] DEFAULT '{}' NOT NULL,
	"chemicals_used" text[] DEFAULT '{}' NOT NULL,
	"supplier_id" integer,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rfqs" ADD CONSTRAINT "rfqs_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_rfq_id_rfqs_id_fk" FOREIGN KEY ("rfq_id") REFERENCES "public"."rfqs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotations" ADD CONSTRAINT "quotations_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collective_order_participants" ADD CONSTRAINT "collective_order_participants_collective_order_id_collective_orders_id_fk" FOREIGN KEY ("collective_order_id") REFERENCES "public"."collective_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collective_order_participants" ADD CONSTRAINT "collective_order_participants_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD CONSTRAINT "collective_orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD CONSTRAINT "collective_orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_supplier_id_users_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_buyer_id_users_id_fk" FOREIGN KEY ("buyer_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_brands" ADD CONSTRAINT "supplier_brands_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_experts" ADD CONSTRAINT "supplier_experts_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_supplier_id_suppliers_id_fk" FOREIGN KEY ("supplier_id") REFERENCES "public"."suppliers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_suppliers_user_id" ON "suppliers" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_suppliers_country" ON "suppliers" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_suppliers_verified" ON "suppliers" USING btree ("verified");--> statement-breakpoint
CREATE INDEX "idx_suppliers_featured" ON "suppliers" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "idx_products_supplier_id" ON "products" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_products_category_id" ON "products" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_products_name" ON "products" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_products_cas_number" ON "products" USING btree ("cas_number");--> statement-breakpoint
CREATE INDEX "idx_products_featured" ON "products" USING btree ("featured");--> statement-breakpoint
CREATE INDEX "idx_rfqs_buyer_id" ON "rfqs" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_rfqs_status" ON "rfqs" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_rfqs_category_id" ON "rfqs" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX "idx_collective_participants_order_id" ON "collective_order_participants" USING btree ("collective_order_id");--> statement-breakpoint
CREATE INDEX "idx_collective_participants_buyer_id" ON "collective_order_participants" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_collective_orders_status" ON "collective_orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_collective_orders_product_id" ON "collective_orders" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_collective_orders_supplier_id" ON "collective_orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_orders_buyer_id" ON "orders" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_orders_supplier_id" ON "orders" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_orders_status" ON "orders" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_conversations_buyer_id" ON "conversations" USING btree ("buyer_id");--> statement-breakpoint
CREATE INDEX "idx_conversations_supplier_id" ON "conversations" USING btree ("supplier_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conversation_id" ON "messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_messages_sender_id" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_user_id" ON "notifications" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_notifications_is_read" ON "notifications" USING btree ("is_read");--> statement-breakpoint
CREATE INDEX "idx_reviews_product_id" ON "reviews" USING btree ("product_id");--> statement-breakpoint
CREATE INDEX "idx_reviews_buyer_id" ON "reviews" USING btree ("buyer_id");