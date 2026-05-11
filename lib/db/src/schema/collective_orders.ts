import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb, pgEnum, index, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { suppliersTable } from "./suppliers";
import { usersTable } from "./users";

export const collectiveOrderStatusEnum = pgEnum("collective_order_status", ["open", "closing_soon", "closed", "fulfilled"]);
export const collectiveOrderStageEnum = pgEnum("collective_order_stage", [
  "gathering",
  "offers_open",
  "offer_selected",
  "allocations_confirming",
  "allocations_locked",
  "supplier_confirmed",
  "admin_review",
  "admin_approved",
  "execution",
  "completed",
  "cancelled",
]);
export const allocationConfirmationStatusEnum = pgEnum("collective_allocation_confirmation_status", ["pending", "confirmed", "withdrawn"]);
export const allocationInvoiceStatusEnum = pgEnum("collective_allocation_invoice_status", ["not_issued", "issued"]);
export const allocationPaymentStatusEnum = pgEnum("collective_allocation_payment_status", ["pending", "confirmed"]);
export const allocationFulfillmentStatusEnum = pgEnum("collective_allocation_fulfillment_status", ["processing", "shipped", "delivered", "completed", "cancelled"]);

export const collectiveOrdersTable = pgTable("collective_orders", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => productsTable.id),
  productName: text("product_name").notNull().default(""),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  createdByBuyerId: integer("created_by_buyer_id").references(() => usersTable.id),
  targetQuantity: numeric("target_quantity", { precision: 12, scale: 2 }).notNull(),
  currentQuantity: numeric("current_quantity", { precision: 12, scale: 2 }).notNull().default("0"),
  unit: text("unit").notNull(),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  currentPrice: numeric("current_price", { precision: 12, scale: 2 }).notNull(),
  pricingTiers: jsonb("pricing_tiers").notNull().default([]),
  status: collectiveOrderStatusEnum("status").notNull().default("open"),
  collectiveStage: collectiveOrderStageEnum("collective_stage").notNull().default("gathering"),
  targetPrice: numeric("target_price", { precision: 12, scale: 2 }),
  recommendedOfferId: integer("recommended_offer_id"),
  selectedOfferId: integer("selected_offer_id"),
  isAllocationLocked: boolean("is_allocation_locked").notNull().default(false),
  isAllocationSharingApproved: boolean("is_allocation_sharing_approved").notNull().default(false),
  deadline: timestamp("deadline").notNull(),
  deliveryRegion: text("delivery_region").notNull(),
  moqPerParticipant: numeric("moq_per_participant", { precision: 12, scale: 2 }).notNull(),
  packagingOptions: text("packaging_options").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_collective_orders_status").on(table.status),
  index("idx_collective_orders_stage").on(table.collectiveStage),
  index("idx_collective_orders_product_id").on(table.productId),
  index("idx_collective_orders_supplier_id").on(table.supplierId),
  index("idx_collective_orders_created_by_buyer_id").on(table.createdByBuyerId),
]);

export const collectiveOrderParticipantsTable = pgTable("collective_order_participants", {
  id: serial("id").primaryKey(),
  collectiveOrderId: integer("collective_order_id").notNull().references(() => collectiveOrdersTable.id),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  deliveryDestination: text("delivery_destination").notNull(),
  paymentTerms: text("payment_terms"),
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => [
  index("idx_collective_participants_order_id").on(table.collectiveOrderId),
  index("idx_collective_participants_buyer_id").on(table.buyerId),
]);

export const collectiveOrderOffersTable = pgTable("collective_order_offers", {
  id: serial("id").primaryKey(),
  collectiveOrderId: integer("collective_order_id").notNull().references(() => collectiveOrdersTable.id),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  unitPrice: numeric("unit_price", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("SAR"),
  availableQty: numeric("available_qty", { precision: 12, scale: 2 }).notNull(),
  leadTime: text("lead_time").notNull(),
  incoterms: text("incoterms").array().notNull().default([]),
  paymentTerms: text("payment_terms"),
  deliveryModel: text("delivery_model").notNull().default("to_be_agreed"),
  deliveryCostMode: text("delivery_cost_mode").notNull().default("quoted_after_supplier_offer"),
  validUntil: timestamp("valid_until"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_collective_offers_order_id").on(table.collectiveOrderId),
  index("idx_collective_offers_supplier_id").on(table.supplierId),
  uniqueIndex("uq_collective_offers_order_supplier").on(table.collectiveOrderId, table.supplierId),
]);

export const collectiveOrderAllocationsTable = pgTable("collective_order_allocations", {
  id: serial("id").primaryKey(),
  collectiveOrderId: integer("collective_order_id").notNull().references(() => collectiveOrdersTable.id),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  finalQty: numeric("final_qty", { precision: 12, scale: 2 }).notNull(),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 12, scale: 2 }).notNull(),
  subtotalSnapshot: numeric("subtotal_snapshot", { precision: 12, scale: 2 }).notNull(),
  deliveryCity: text("delivery_city"),
  deliveryAddress: text("delivery_address"),
  contactName: text("contact_name"),
  contactPhone: text("contact_phone"),
  contactEmail: text("contact_email"),
  confirmationStatus: allocationConfirmationStatusEnum("confirmation_status").notNull().default("pending"),
  invoiceStatus: allocationInvoiceStatusEnum("invoice_status").notNull().default("not_issued"),
  paymentStatus: allocationPaymentStatusEnum("payment_status").notNull().default("pending"),
  fulfillmentStatus: allocationFulfillmentStatusEnum("fulfillment_status").notNull().default("processing"),
  proformaInvoiceUrl: text("proforma_invoice_url"),
  commercialInvoiceUrl: text("commercial_invoice_url"),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_collective_allocations_order_id").on(table.collectiveOrderId),
  index("idx_collective_allocations_buyer_id").on(table.buyerId),
  uniqueIndex("uq_collective_allocations_order_buyer").on(table.collectiveOrderId, table.buyerId),
]);

export const insertCollectiveOrderSchema = createInsertSchema(collectiveOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCollectiveOrder = z.infer<typeof insertCollectiveOrderSchema>;
export type CollectiveOrder = typeof collectiveOrdersTable.$inferSelect;
export type CollectiveOrderParticipant = typeof collectiveOrderParticipantsTable.$inferSelect;
export type CollectiveOrderOffer = typeof collectiveOrderOffersTable.$inferSelect;
export type CollectiveOrderAllocation = typeof collectiveOrderAllocationsTable.$inferSelect;
