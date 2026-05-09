import { pgTable, serial, text, integer, numeric, boolean, timestamp, index, pgEnum, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const supplierPlanEnum = pgEnum("supplier_plan", ["trial", "starter", "growth", "enterprise"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["trial", "active", "past_due", "suspended", "cancelled"]);
export const billingCycleEnum = pgEnum("billing_cycle", ["monthly", "yearly", "custom"]);

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
  supplierPlan: supplierPlanEnum("supplier_plan").notNull().default("trial"),
  subscriptionStatus: subscriptionStatusEnum("subscription_status").notNull().default("trial"),
  trialEndsAt: timestamp("trial_ends_at"),
  gracePeriodEndsAt: timestamp("grace_period_ends_at"),
  subscriptionStartedAt: timestamp("subscription_started_at"),
  subscriptionRenewalDate: timestamp("subscription_renewal_date"),
  billingCycle: billingCycleEnum("billing_cycle").notNull().default("monthly"),
  internalAdminNotes: text("internal_admin_notes"),
  featuredSupplier: boolean("featured_supplier").notNull().default(false),
  productLimit: integer("product_limit").default(3),
  rfqAccessEnabled: boolean("rfq_access_enabled").notNull().default(true),
  storefrontVisible: boolean("storefront_visible").notNull().default(true),
  productsPublic: boolean("products_public").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  index("idx_suppliers_user_id").on(table.userId),
  index("idx_suppliers_country").on(table.country),
  index("idx_suppliers_verified").on(table.verified),
  index("idx_suppliers_featured").on(table.featured),
  index("idx_suppliers_supplier_plan").on(table.supplierPlan),
  index("idx_suppliers_subscription_status").on(table.subscriptionStatus),
  index("idx_suppliers_storefront_visible").on(table.storefrontVisible),
  index("idx_suppliers_products_public").on(table.productsPublic),
]);

export const insertSupplierSchema = createInsertSchema(suppliersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertSupplier = z.infer<typeof insertSupplierSchema>;
export type Supplier = typeof suppliersTable.$inferSelect;

export const adminAuditLogsTable = pgTable("admin_audit_logs", {
  id: serial("id").primaryKey(),
  adminUserId: integer("admin_user_id").notNull().references(() => usersTable.id),
  supplierId: integer("supplier_id").references(() => suppliersTable.id),
  action: text("action").notNull(),
  detailsJson: jsonb("details_json").notNull().default({}),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_admin_audit_logs_admin_user_id").on(table.adminUserId),
  index("idx_admin_audit_logs_supplier_id").on(table.supplierId),
  index("idx_admin_audit_logs_action").on(table.action),
]);
