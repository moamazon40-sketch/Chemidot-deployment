import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { productsTable } from "./products";
import { suppliersTable } from "./suppliers";
import { usersTable } from "./users";

export const collectiveOrderStatusEnum = pgEnum("collective_order_status", ["open", "closing_soon", "closed", "fulfilled"]);

export const collectiveOrdersTable = pgTable("collective_orders", {
  id: serial("id").primaryKey(),
  productId: integer("product_id").references(() => productsTable.id),
  productName: text("product_name").notNull().default(""),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  targetQuantity: numeric("target_quantity", { precision: 12, scale: 2 }).notNull(),
  currentQuantity: numeric("current_quantity", { precision: 12, scale: 2 }).notNull().default("0"),
  unit: text("unit").notNull(),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }).notNull(),
  currentPrice: numeric("current_price", { precision: 12, scale: 2 }).notNull(),
  pricingTiers: jsonb("pricing_tiers").notNull().default([]),
  status: collectiveOrderStatusEnum("status").notNull().default("open"),
  deadline: timestamp("deadline").notNull(),
  deliveryRegion: text("delivery_region").notNull(),
  moqPerParticipant: numeric("moq_per_participant", { precision: 12, scale: 2 }).notNull(),
  packagingOptions: text("packaging_options").array().notNull().default([]),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_collective_orders_status").on(table.status),
  index("idx_collective_orders_product_id").on(table.productId),
  index("idx_collective_orders_supplier_id").on(table.supplierId),
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

export const insertCollectiveOrderSchema = createInsertSchema(collectiveOrdersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertCollectiveOrder = z.infer<typeof insertCollectiveOrderSchema>;
export type CollectiveOrder = typeof collectiveOrdersTable.$inferSelect;
export type CollectiveOrderParticipant = typeof collectiveOrderParticipantsTable.$inferSelect;
