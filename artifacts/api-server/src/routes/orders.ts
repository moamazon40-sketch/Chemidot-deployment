import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable, ordersTable, productsTable, suppliersTable, usersTable } from "@workspace/db";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { canUserBuy, canUserSell, requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { UpdateOrderStatusBody } from "@workspace/api-zod";
import { z } from "zod/v4";

const router = Router();

const confirmAvailabilityBody = z.object({
  confirmedUnitPrice: z.number().positive(),
  confirmedQuantity: z.number().positive(),
  confirmedLeadTime: z.string().min(1).max(120),
  confirmedIncoterm: z.string().min(1).max(40),
  paymentTerms: z.string().min(1).max(500),
  offerValidityDate: z.string().min(1),
});
const issueInvoiceBody = z.object({
  proformaInvoiceUrl: z.string().min(1).max(1000),
  commercialInvoiceUrl: z.string().max(1000).optional(),
  orderDocumentNotes: z.string().max(1000).optional(),
});

async function notifyUser(input: {
  userId?: number | null;
  type: "rfq_update" | "new_quotation" | "order_update" | "collective_milestone" | "payment_reminder" | "system";
  title: string;
  message: string;
  relatedId?: number | null;
  relatedType?: string;
}) {
  if (!input.userId) return;
  await db.insert(notificationsTable).values({
    userId: input.userId,
    type: input.type,
    title: input.title,
    message: input.message,
    relatedId: input.relatedId ?? null,
    relatedType: input.relatedType ?? null,
    isRead: false,
  });
}

function buildOrder(r: any) {
  const statusWorkflow = STATUS_WORKFLOW[r.orders.status as keyof typeof STATUS_WORKFLOW];
  return {
    id: r.orders.id,
    buyerId: r.orders.buyerId,
    supplierId: r.orders.supplierId,
    supplierName: r.suppliers?.companyName ?? "",
    productName: r.orders.productName ?? r.products?.name ?? "",
    quantity: parseFloat(r.orders.quantity),
    unit: r.orders.unit,
    totalPrice: parseFloat(r.orders.totalPrice),
    currency: r.orders.currency,
    status: r.orders.status,
    dealStage: r.orders.dealStage,
    paymentStatus: r.orders.paymentStatus,
    fulfillmentStatus: r.orders.fulfillmentStatus,
    confirmedUnitPrice: r.orders.confirmedUnitPrice ? parseFloat(r.orders.confirmedUnitPrice) : null,
    confirmedQuantity: r.orders.confirmedQuantity ? parseFloat(r.orders.confirmedQuantity) : null,
    confirmedLeadTime: r.orders.confirmedLeadTime,
    confirmedIncoterm: r.orders.confirmedIncoterm,
    paymentTerms: r.orders.paymentTerms,
    offerValidityDate: r.orders.offerValidityDate instanceof Date
      ? r.orders.offerValidityDate.toISOString()
      : r.orders.offerValidityDate,
    proformaInvoiceUrl: r.orders.proformaInvoiceUrl,
    commercialInvoiceUrl: r.orders.commercialInvoiceUrl,
    invoiceIssuedAt: r.orders.invoiceIssuedAt instanceof Date
      ? r.orders.invoiceIssuedAt.toISOString()
      : r.orders.invoiceIssuedAt,
    invoiceStatus: r.orders.invoiceStatus,
    orderDocumentNotes: r.orders.orderDocumentNotes,
    statusDescription: statusWorkflow,
    trackingNumber: r.orders.trackingNumber,
    estimatedDelivery: r.orders.estimatedDelivery instanceof Date
      ? r.orders.estimatedDelivery.toISOString()
      : r.orders.estimatedDelivery,
    createdAt: r.orders.createdAt instanceof Date ? r.orders.createdAt.toISOString() : r.orders.createdAt,
  };
}

const VALID_TRANSITIONS: Record<string, { roles: string[]; next: string[] }> = {
  pending: { roles: ["supplier"], next: ["confirmed", "cancelled"] },
  confirmed: { roles: ["supplier"], next: ["processing", "cancelled"] },
  processing: { roles: ["supplier"], next: ["shipped", "cancelled"] },
  shipped: { roles: ["supplier", "buyer"], next: ["delivered", "cancelled"] },
  delivered: { roles: ["buyer"], next: [] },
  cancelled: { roles: [], next: [] },
};

// Additional status transitions for better workflow
const STATUS_WORKFLOW = {
  pending: "Order received, awaiting confirmation",
  confirmed: "Order confirmed by buyer, preparing for shipment",
  processing: "Order is being processed and prepared for shipping",
  shipped: "Order has been shipped, tracking available",
  delivered: "Order has been delivered successfully",
  completed: "Deal closed by Chemidot admin",
  cancelled: "Order has been cancelled"
} as const;

router.get("/orders", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { status, page = "1", limit = "20", view } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  const requestedView = view === "sell" ? "sell" : "buy";

  if (user.role === "admin") {
    // admin sees all
  } else if (requestedView === "buy") {
    if (!canUserBuy(user)) {
      res.status(403).json({ message: "Buying capability is required for this view." });
      return;
    }
    conditions.push(eq(ordersTable.buyerId, user.id));
  } else {
    if (!canUserSell(user)) {
      res.status(403).json({ message: "Selling capability is required for this view." });
      return;
    }
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
    if (supplier) {
      conditions.push(eq(ordersTable.supplierId, supplier.id));
    } else {
      conditions.push(sql`false`);
    }
  }

  if (status) conditions.push(eq(ordersTable.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(ordersTable)
      .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
      .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
      .where(whereClause)
      .orderBy(desc(ordersTable.createdAt))
      .limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(ordersTable).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    orders: rows.map(buildOrder),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.post("/orders", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!canUserBuy(user)) {
    res.status(403).json({ message: "Buying capability is required for this action." });
    return;
  }
  const { supplierId, productId, productName, quantity, unit, totalPrice, currency, deliveryAddress } = req.body;

  if (!supplierId || !quantity || !totalPrice) {
    res.status(400).json({ message: "supplierId, quantity, and totalPrice are required" });
    return;
  }

  const [order] = await db.insert(ordersTable).values({
    buyerId: user.id,
    supplierId,
    productId: productId ?? null,
    productName: productName ?? null,
    quantity: String(quantity),
    unit: unit ?? "MT",
    totalPrice: String(totalPrice),
    currency: currency ?? "USD",
    status: "pending",
    deliveryAddress: deliveryAddress ?? null,
  }).returning();

  const [row] = await db.select().from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, order.id)).limit(1);

  res.status(201).json(buildOrder(row));
}));

router.get("/orders/:id", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [r] = await db.select().from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id)).limit(1);

  if (!r) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  const isBuyer = r.orders.buyerId === user.id;
  const isSupplier = r.suppliers && r.suppliers.userId === user.id;
  const isAdmin = user.role === "admin";
  if (!isBuyer && !isSupplier && !isAdmin) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  res.json(buildOrder(r));
}));

router.patch("/orders/:id/confirm-availability", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = confirmAvailabilityBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid final terms", errors: parsed.error.issues });
    return;
  }

  const [r] = await db.select().from(ordersTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id))
    .limit(1);

  if (!r) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  if (!r.suppliers || r.suppliers.userId !== user.id) {
    res.status(403).json({ message: "Only the assigned supplier can confirm availability" });
    return;
  }
  if (r.orders.dealStage !== "buyer_accepted" && r.orders.dealStage !== "admin_needs_review") {
    res.status(400).json({ message: "This order is not waiting for supplier confirmation" });
    return;
  }

  const body = parsed.data;
  const validityDate = new Date(body.offerValidityDate);
  if (Number.isNaN(validityDate.getTime())) {
    res.status(400).json({ message: "Offer validity date is invalid" });
    return;
  }

  await db.update(ordersTable).set({
    confirmedUnitPrice: String(body.confirmedUnitPrice),
    confirmedQuantity: String(body.confirmedQuantity),
    confirmedLeadTime: body.confirmedLeadTime.trim(),
    confirmedIncoterm: body.confirmedIncoterm.trim(),
    paymentTerms: body.paymentTerms.trim(),
    offerValidityDate: validityDate,
    dealStage: "supplier_confirmed",
    status: "confirmed",
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, id));

  const adminUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
  await Promise.all([
    notifyUser({
      userId: r.orders.buyerId,
      type: "order_update",
      title: "Supplier confirmed availability",
      message: `${r.suppliers.companyName} confirmed final terms for ${r.orders.productName ?? "your order"}.`,
      relatedId: r.orders.id,
      relatedType: "order",
    }),
    ...adminUsers.map((admin) => notifyUser({
      userId: admin.id,
      type: "order_update",
      title: "Deal ready for Chemidot review",
      message: `${r.suppliers?.companyName ?? "A supplier"} confirmed final terms for ${r.orders.productName ?? "an order"}.`,
      relatedId: r.orders.id,
      relatedType: "order",
    })),
  ]);

  const [updated] = await db.select().from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id))
    .limit(1);

  res.json(buildOrder(updated));
}));

router.patch("/orders/:id/final-confirmation", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));

  const [r] = await db.select().from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id))
    .limit(1);

  if (!r) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  if (r.orders.buyerId !== user.id) {
    res.status(403).json({ message: "Only the buyer can confirm the final order" });
    return;
  }
  if (r.orders.dealStage !== "admin_approved") {
    res.status(400).json({ message: "This order is not ready for buyer final confirmation" });
    return;
  }

  await db.update(ordersTable).set({
    dealStage: "buyer_confirmed",
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, id));

  const adminUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
  await Promise.all([
    notifyUser({
      userId: r.suppliers?.userId,
      type: "order_update",
      title: "Buyer confirmed final order",
      message: `The buyer confirmed the final order for ${r.orders.productName ?? "an order"}.`,
      relatedId: r.orders.id,
      relatedType: "order",
    }),
    ...adminUsers.map((admin) => notifyUser({
      userId: admin.id,
      type: "order_update",
      title: "Buyer confirmed final order",
      message: `Buyer confirmed final order #${r.orders.id}.`,
      relatedId: r.orders.id,
      relatedType: "order",
    })),
  ]);

  const [updated] = await db.select().from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id))
    .limit(1);

  res.json(buildOrder(updated));
}));

router.patch("/orders/:id/issue-invoice", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = issueInvoiceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid invoice details", errors: parsed.error.issues });
    return;
  }

  const [r] = await db.select().from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id))
    .limit(1);

  if (!r) {
    res.status(404).json({ message: "Order not found" });
    return;
  }
  if (!r.suppliers || r.suppliers.userId !== user.id) {
    res.status(403).json({ message: "Only the assigned supplier can issue invoice documents" });
    return;
  }
  if (r.orders.dealStage !== "buyer_confirmed") {
    res.status(400).json({ message: "Invoice can only be issued after buyer final confirmation" });
    return;
  }

  const body = parsed.data;
  await db.update(ordersTable).set({
    proformaInvoiceUrl: body.proformaInvoiceUrl.trim(),
    commercialInvoiceUrl: body.commercialInvoiceUrl?.trim() || null,
    orderDocumentNotes: body.orderDocumentNotes?.trim() || null,
    invoiceIssuedAt: new Date(),
    invoiceStatus: "issued",
    dealStage: "invoice_issued",
    paymentStatus: "pending",
    updatedAt: new Date(),
  }).where(eq(ordersTable.id, id));

  const adminUsers = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
  await Promise.all([
    notifyUser({
      userId: r.orders.buyerId,
      type: "order_update",
      title: "Invoice issued",
      message: "Supplier issued an invoice for your order.",
      relatedId: r.orders.id,
      relatedType: "order",
    }),
    ...adminUsers.map((admin) => notifyUser({
      userId: admin.id,
      type: "order_update",
      title: "Invoice issued",
      message: `Supplier issued invoice documents for order #${r.orders.id}.`,
      relatedId: r.orders.id,
      relatedType: "order",
    })),
  ]);

  const [updated] = await db.select().from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id))
    .limit(1);

  res.json(buildOrder(updated));
}));

router.patch("/orders/:id/status", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));

  const parsed = UpdateOrderStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const [r] = await db.select().from(ordersTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id)).limit(1);

  if (!r) {
    res.status(404).json({ message: "Order not found" });
    return;
  }

  const isBuyer = r.orders.buyerId === user.id;
  const isSupplier = r.suppliers && r.suppliers.userId === user.id;
  if (!isBuyer && !isSupplier && user.role !== "admin") {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const currentStatus = r.orders.status;
  const transition = VALID_TRANSITIONS[currentStatus];
  const body = parsed.data;

  if (!transition || !transition.next.includes(body.status)) {
    res.status(400).json({ message: `Cannot transition from ${currentStatus} to ${body.status}` });
    return;
  }

  if (isSupplier && !transition.roles.includes("supplier")) {
    res.status(403).json({ message: "Suppliers cannot perform this status transition" });
    return;
  }
  if (isBuyer && !isSupplier && !transition.roles.includes("buyer")) {
    res.status(403).json({ message: "Buyers cannot perform this status transition" });
    return;
  }

  const updates: any = { status: body.status, updatedAt: new Date() };
  if (body.trackingNumber) updates.trackingNumber = body.trackingNumber;
  if (body.estimatedDelivery) updates.estimatedDelivery = new Date(body.estimatedDelivery);

  await db.update(ordersTable).set(updates).where(eq(ordersTable.id, id));

  const [updated] = await db.select().from(ordersTable)
    .leftJoin(productsTable, eq(productsTable.id, ordersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, ordersTable.supplierId))
    .where(eq(ordersTable.id, id)).limit(1);

  res.json(buildOrder(updated));
}));

export default router;
