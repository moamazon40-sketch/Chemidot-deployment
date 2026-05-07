import { pgTable, serial, text, integer, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { suppliersTable } from "./suppliers";
import { productsTable } from "./products";

export const orderStatusEnum = pgEnum("order_status", ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled"]);

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
  trackingNumber: text("tracking_number"),
  estimatedDelivery: timestamp("estimated_delivery"),
  deliveryAddress: text("delivery_address"),
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
