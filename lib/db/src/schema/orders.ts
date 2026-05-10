import { pgTable, serial, text, integer, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { suppliersTable } from "./suppliers";
import { productsTable } from "./products";

export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "processing", "shipped", "delivered", "completed", "cancelled"]);
export const successFeeStatusEnum = pgEnum("success_fee_status", ["pending", "invoiced", "paid", "waived"]);
export const successFeePayerEnum = pgEnum("success_fee_payer", ["supplier"]);
export const dealStageEnum = pgEnum("deal_stage", [
  "buyer_accepted",
  "supplier_confirmed",
  "admin_needs_review",
  "admin_approved",
  "buyer_confirmed",
  "invoice_issued",
  "closed",
  "cancelled",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["not_started", "pending", "confirmed"]);
export const invoiceStatusEnum = pgEnum("invoice_status", ["not_issued", "issued"]);
export const fulfillmentStatusEnum = pgEnum("fulfillment_status", [
  "not_started",
  "preparing",
  "ready_for_pickup",
  "shipped",
  "delivered",
  "completed",
  "cancelled",
]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  productId: integer("product_id").references(() => productsTable.id),
  rfqId: integer("rfq_id"),
  quotationId: integer("quotation_id"),
  productName: text("product_name"),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  status: orderStatusEnum("status").notNull().default("pending"),
  dealStage: dealStageEnum("deal_stage"),
  paymentStatus: paymentStatusEnum("payment_status").notNull().default("not_started"),
  fulfillmentStatus: fulfillmentStatusEnum("fulfillment_status").notNull().default("not_started"),
  confirmedUnitPrice: numeric("confirmed_unit_price", { precision: 14, scale: 2 }),
  confirmedQuantity: numeric("confirmed_quantity", { precision: 12, scale: 2 }),
  confirmedLeadTime: text("confirmed_lead_time"),
  confirmedIncoterm: text("confirmed_incoterm"),
  paymentTerms: text("payment_terms"),
  offerValidityDate: timestamp("offer_validity_date"),
  proformaInvoiceUrl: text("proforma_invoice_url"),
  commercialInvoiceUrl: text("commercial_invoice_url"),
  invoiceIssuedAt: timestamp("invoice_issued_at"),
  invoiceStatus: invoiceStatusEnum("invoice_status").notNull().default("not_issued"),
  orderDocumentNotes: text("order_document_notes"),
  trackingNumber: text("tracking_number"),
  estimatedDelivery: timestamp("estimated_delivery"),
  deliveryAddress: text("delivery_address"),
  dealValue: numeric("deal_value", { precision: 14, scale: 2 }),
  dealCurrency: text("deal_currency"),
  successFeeRate: numeric("success_fee_rate", { precision: 5, scale: 4 }).notNull().default("0.0200"),
  successFeeAmount: numeric("success_fee_amount", { precision: 14, scale: 2 }),
  successFeePayer: successFeePayerEnum("success_fee_payer").notNull().default("supplier"),
  successFeeStatus: successFeeStatusEnum("success_fee_status"),
  successFeeNotes: text("success_fee_notes"),
  successFeeMarkedAt: timestamp("success_fee_marked_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_orders_buyer_id").on(table.buyerId),
  index("idx_orders_supplier_id").on(table.supplierId),
  index("idx_orders_status").on(table.status),
]);

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
