CREATE TYPE "public"."negotiation_type" AS ENUM('message', 'counter_offer');--> statement-breakpoint
CREATE TABLE "negotiation_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"quotation_id" integer NOT NULL,
	"sender_id" integer NOT NULL,
	"sender_role" text NOT NULL,
	"type" "negotiation_type" DEFAULT 'message' NOT NULL,
	"content" text NOT NULL,
	"proposed_price" numeric(12, 2),
	"proposed_delivery_time" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "collective_orders" ALTER COLUMN "product_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "collective_orders" ADD COLUMN "product_name" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "negotiation_messages" ADD CONSTRAINT "negotiation_messages_quotation_id_quotations_id_fk" FOREIGN KEY ("quotation_id") REFERENCES "public"."quotations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "negotiation_messages" ADD CONSTRAINT "negotiation_messages_sender_id_users_id_fk" FOREIGN KEY ("sender_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_neg_msgs_quotation_id" ON "negotiation_messages" USING btree ("quotation_id");--> statement-breakpoint
CREATE INDEX "idx_neg_msgs_sender_id" ON "negotiation_messages" USING btree ("sender_id");