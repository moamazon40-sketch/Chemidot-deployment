import { pgTable, serial, text, integer, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const rfqStatusEnum = pgEnum("rfq_status", ["pending", "active", "closed", "awarded"]);

export const rfqsTable = pgTable("rfqs", {
  id: serial("id").primaryKey(),
  buyerId: integer("buyer_id").notNull().references(() => usersTable.id),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  productName: text("product_name").notNull(),
  casNumber: text("cas_number"),
  quantity: numeric("quantity", { precision: 12, scale: 2 }).notNull(),
  unit: text("unit").notNull(),
  deliveryDestination: text("delivery_destination").notNull(),
  deliveryDeadline: timestamp("delivery_deadline").notNull(),
  description: text("description"),
  specifications: text("specifications"),
  status: rfqStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_rfqs_buyer_id").on(table.buyerId),
  index("idx_rfqs_status").on(table.status),
  index("idx_rfqs_category_id").on(table.categoryId),
]);

export const insertRfqSchema = createInsertSchema(rfqsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRfq = z.infer<typeof insertRfqSchema>;
export type Rfq = typeof rfqsTable.$inferSelect;
