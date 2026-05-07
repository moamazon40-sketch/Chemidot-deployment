import { pgTable, serial, text, integer, numeric, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const suppliersTable = pgTable("suppliers", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id),
  companyName: text("company_name").notNull(),
  logoUrl: text("logo_url"),
  coverUrl: text("cover_url"),
  description: text("description"),
  country: text("country").notNull(),
  warehouseLocation: text("warehouse_location"),
  commercialRegNumber: text("commercial_reg_number"),
  certifications: text("certifications").array().notNull().default([]),
  verified: boolean("verified").notNull().default(false),
  responseRate: numeric("response_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  avgResponseTime: text("avg_response_time").notNull().default("24 hours"),
  yearsInBusiness: integer("years_in_business"),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_suppliers_user_id").on(table.userId),
  index("idx_suppliers_country").on(table.country),
  index("idx_suppliers_verified").on(table.verified),
  index("idx_suppliers_featured").on(table.featured),
]);

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;
