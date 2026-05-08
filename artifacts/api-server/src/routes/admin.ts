import { Router } from "express";
import { db, pool } from "@workspace/db";
import { usersTable, suppliersTable, productsTable, rfqsTable, ordersTable, collectiveOrdersTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AdminUpdateUserStatusBody } from "@workspace/api-zod";

const router = Router();

// TEMPORARY: remove after one-time cleanup.
const TEMP_CLEANUP_SECRET = "CHEMIDOT_ADMIN_CLEANUP_2026";

router.post("/admin/cleanup-test-data", asyncHandler(async (req, res) => {
  const secret = String(req.headers["x-admin-secret"] ?? "");
  if (secret !== TEMP_CLEANUP_SECRET) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  // Children -> parents (FK-safe). Keep reference tables like `categories`.
  const tablesInOrder = [
    "negotiation_messages",
    "messages",
    "conversations",
    "notifications",
    "collective_order_participants",
    "collective_orders",
    "quotations",
    "rfqs",
    "orders",
    "reviews",
    "products",
    "supplier_experts",
    "supplier_documents",
    "supplier_brands",
    "projects",
    "suppliers",
    "users",
  ] as const;

  const client = await pool.connect();
  const deleted: Array<{ table: string; deleted: number }> = [];

  try {
    await client.query("begin");

    for (const table of tablesInOrder) {
      // table name is from a hardcoded allowlist above.
      const result = await client.query(`delete from "${table}"`);
      deleted.push({ table, deleted: result.rowCount ?? 0 });
    }

    await client.query("commit");
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }

  res.json({
    success: true,
    deleted,
  });
}));

router.get("/admin/users", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const { role, status, page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (role) conditions.push(eq(usersTable.role, role));
  if (status) conditions.push(eq(usersTable.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(usersTable).where(whereClause).orderBy(desc(usersTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(usersTable).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    users: rows.map(u => {
      const { passwordHash: _, ...safe } = u;
      return { ...safe, avatarUrl: null, createdAt: u.createdAt.toISOString() };
    }),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.put("/admin/users/:id/status", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const parsed = AdminUpdateUserStatusBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  await db.update(usersTable).set({ status: parsed.data.status, updatedAt: new Date() }).where(eq(usersTable.id, id));
  res.json({ message: "User status updated" });
}));

router.put("/admin/suppliers/:id/verify", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  await db.update(suppliersTable).set({ verified: true, updatedAt: new Date() }).where(eq(suppliersTable.id, id));
  res.json({ message: "Supplier verified" });
}));

router.get("/admin/stats", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const [users, suppliers, products, rfqs, orders, pending, collectiveActive] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(usersTable),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(suppliersTable),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(productsTable),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(rfqsTable),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(ordersTable),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(suppliersTable).where(eq(suppliersTable.verified, false)),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(collectiveOrdersTable).where(eq(collectiveOrdersTable.status, "open")),
  ]);

  res.json({
    totalUsers: users[0]?.count ?? 0,
    totalSuppliers: suppliers[0]?.count ?? 0,
    pendingVerifications: pending[0]?.count ?? 0,
    totalProducts: products[0]?.count ?? 0,
    totalRfqs: rfqs[0]?.count ?? 0,
    totalOrders: orders[0]?.count ?? 0,
    totalRevenue: 0,
    activeCollectiveOrders: collectiveActive[0]?.count ?? 0,
    usersByMonth: [],
    revenueByMonth: [],
  });
}));

export default router;
