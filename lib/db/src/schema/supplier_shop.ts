import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { suppliersTable } from "./suppliers";

export const supplierBrandsTable = pgTable("supplier_brands", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  logoUrl: text("logo_url"),
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supplierDocumentsTable = pgTable("supplier_documents", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  type: text("type").notNull(),
  fileUrl: text("file_url").notNull(),
  fileSize: text("file_size"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const supplierExpertsTable = pgTable("supplier_experts", {
  id: serial("id").primaryKey(),
  supplierId: integer("supplier_id").notNull().references(() => suppliersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  title: text("title").notNull(),
  email: text("email").notNull(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertSupplierBrandSchema = createInsertSchema(supplierBrandsTable).omit({ id: true, createdAt: true });
export const insertSupplierDocumentSchema = createInsertSchema(supplierDocumentsTable).omit({ id: true, createdAt: true });
export const insertSupplierExpertSchema = createInsertSchema(supplierExpertsTable).omit({ id: true, createdAt: true });

export type SupplierBrand = typeof supplierBrandsTable.$inferSelect;
export type SupplierDocument = typeof supplierDocumentsTable.$inferSelect;
export type SupplierExpert = typeof supplierExpertsTable.$inferSelect;
export type InsertSupplierBrand = z.infer<typeof insertSupplierBrandSchema>;
export type InsertSupplierDocument = z.infer<typeof insertSupplierDocumentSchema>;
export type InsertSupplierExpert = z.infer<typeof insertSupplierExpertSchema>;
