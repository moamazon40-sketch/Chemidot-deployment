import { Router } from "express";
import { db } from "@workspace/db";
import { ordersTable, productsTable, suppliersTable } from "@workspace/db";
import { eq, and, or, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { UpdateOrderStatusBody } from "@workspace/api-zod";

const router = Router();

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
  const { status, page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];

  if (user.role === "buyer") {
    conditions.push(eq(ordersTable.buyerId, user.id));
  } else if (user.role === "supplier") {
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
    if (supplier) {
      conditions.push(eq(ordersTable.supplierId, supplier.id));
    } else {
      conditions.push(sql`false`);
    }
  } else if (user.role === "admin") {
    // admin sees all
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
