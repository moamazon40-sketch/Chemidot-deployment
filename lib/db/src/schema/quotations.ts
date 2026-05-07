import { pgTable, serial, text, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { rfqsTable } from "./rfqs";
import { suppliersTable } from "./suppliers";

export const quotationStatusEnum = pgEnum("quotation_status", ["pending", "accepted", "rejected", "expired"]);

export const quotationsTable = pgTable("quotations", {
  id: serial("id").primaryKey(),
  rfqId: integer("rfq_id").notNull().references(() => rfqsTable.id),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  pricePerUnit: numeric("price_per_unit", { precision: 12, scale: 2 }).notNull(),
  currency: text("currency").notNull().default("USD"),
  deliveryTime: text("delivery_time").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  notes: text("notes"),
  status: quotationStatusEnum("status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertQuotationSchema = createInsertSchema(quotationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertQuotation = z.infer<typeof insertQuotationSchema>;
export type Quotation = typeof quotationsTable.$inferSelect;
