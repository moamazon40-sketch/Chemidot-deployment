import { pgTable, serial, text, integer, numeric, boolean, timestamp, jsonb, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";
import { categoriesTable } from "./categories";

export const availabilityEnum = pgEnum("availability_status", ["in_stock", "limited", "out_of_stock"]);

export const productsTable = pgTable("products", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id),
  name: text("name").notNull(),
  casNumber: text("cas_number"),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  images: text("images").array().notNull().default([]),
  moq: numeric("moq", { precision: 12, scale: 2 }).notNull(),
  moqUnit: text("moq_unit").notNull().default("ton"),
  basePrice: numeric("base_price", { precision: 12, scale: 2 }),
  currency: text("currency").notNull().default("USD"),
  availability: availabilityEnum("availability").notNull().default("in_stock"),
  deliveryLeadTime: text("delivery_lead_time").notNull().default("2-4 weeks"),
  collectiveEligible: boolean("collective_eligible").notNull().default(false),
  countryOfOrigin: text("country_of_origin").notNull(),
  packaging: text("packaging"),
  sdsDocumentUrl: text("sds_document_url"),
  technicalSpecs: jsonb("technical_specs").notNull().default([]),
  pricingTiers: jsonb("pricing_tiers").notNull().default([]),
  applications: text("applications").array().notNull().default([]),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_products_supplier_id").on(table.supplierId),
  index("idx_products_category_id").on(table.categoryId),
  index("idx_products_name").on(table.name),
  index("idx_products_cas_number").on(table.casNumber),
  index("idx_products_featured").on(table.featured),
]);

export const insertProductSchema = createInsertSchema(productsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;
