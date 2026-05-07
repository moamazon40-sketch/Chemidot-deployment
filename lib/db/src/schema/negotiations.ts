import { pgTable, serial, text, integer, numeric, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { quotationsTable } from "./quotations";
import { usersTable } from "./users";

export const negotiationTypeEnum = pgEnum("negotiation_type", ["message", "counter_offer"]);

export const negotiationMessagesTable = pgTable("negotiation_messages", {
  id: serial("id").primaryKey(),
  quotationId: integer("quotation_id").notNull().references(() => quotationsTable.id),
  senderId: integer("sender_id").notNull().references(() => usersTable.id),
  senderRole: text("sender_role").notNull(),
  type: negotiationTypeEnum("type").notNull().default("message"),
  content: text("content").notNull(),
  proposedPrice: numeric("proposed_price", { precision: 12, scale: 2 }),
  proposedDeliveryTime: text("proposed_delivery_time"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => [
  index("idx_neg_msgs_quotation_id").on(table.quotationId),
  index("idx_neg_msgs_sender_id").on(table.senderId),
]);

export const insertNegotiationMessageSchema = createInsertSchema(negotiationMessagesTable).omit({ id: true, createdAt: true });
export type InsertNegotiationMessage = z.infer<typeof insertNegotiationMessageSchema>;
export type NegotiationMessage = typeof negotiationMessagesTable.$inferSelect;
