import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, suppliersTable, productsTable, rfqsTable, ordersTable, collectiveOrdersTable, categoriesTable } from "@workspace/db";
import { eq, sql, desc, and } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { AdminUpdateUserStatusBody } from "@workspace/api-zod";

const router = Router();


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


router.put("/admin/users/:id/role", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const role = String((req.body as any)?.role ?? "");
  if (!role || !["buyer", "supplier", "admin"].includes(role)) {
    res.status(400).json({ message: "Invalid role" });
    return;
  }

  await db.update(usersTable).set({ role: role as any, updatedAt: new Date() }).where(eq(usersTable.id, id));
  res.json({ message: "User role updated" });
}));

router.get("/admin/suppliers", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const { search, verified, page = "1", limit = "50" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (verified === "true") conditions.push(eq(suppliersTable.verified, true));
  if (verified === "false") conditions.push(eq(suppliersTable.verified, false));
  if (search) conditions.push(sql`${suppliersTable.companyName} ilike ${`%${String(search)}%`}`);

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(suppliersTable).where(whereClause).orderBy(desc(suppliersTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(suppliersTable).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({ suppliers: rows, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) });
}));

router.patch("/admin/suppliers/:id", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const updates: Record<string, any> = { updatedAt: new Date() };

  for (const key of ["companyName", "description", "country", "verified", "featured"] as const) {
    if ((req.body as any)[key] !== undefined) updates[key] = (req.body as any)[key];
  }

  const [updated] = await db.update(suppliersTable).set(updates).where(eq(suppliersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ message: "Supplier not found" }); return; }
  res.json(updated);
}));

router.get("/admin/products", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const { search, supplierId, categoryId, page = "1", limit = "50" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (supplierId) conditions.push(eq(productsTable.supplierId, parseInt(supplierId)));
  if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId)));
  if (search) conditions.push(sql`${productsTable.name} ilike ${`%${String(search)}%`}`);
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(productsTable)
      .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(whereClause)
      .orderBy(desc(productsTable.createdAt))
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(productsTable)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    products: rows.map((r: any) => ({ ...r.products, supplier: r.suppliers, category: r.categories })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.patch("/admin/products/:id", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const updates: Record<string, any> = { updatedAt: new Date() };
  for (const key of [
    "name", "casNumber", "description", "imageUrl", "moq", "moqUnit", "basePrice", "currency",
    "availability", "deliveryLeadTime", "collectiveEligible", "countryOfOrigin", "packaging", "sdsDocumentUrl",
    "technicalSpecs", "pricingTiers", "applications", "featured", "categoryId",
  ] as const) {
    if ((req.body as any)[key] !== undefined) updates[key] = (req.body as any)[key];
  }

  const [updated] = await db.update(productsTable).set(updates).where(eq(productsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ message: "Product not found" }); return; }
  res.json(updated);
}));

router.get("/admin/rfqs", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const { status, page = "1", limit = "50" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (status) conditions.push(eq(rfqsTable.status, status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(rfqsTable).leftJoin(usersTable, eq(usersTable.id, rfqsTable.buyerId)).where(whereClause)
      .orderBy(desc(rfqsTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(rfqsTable).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    rfqs: rows.map((r: any) => ({ ...r.rfqs, buyer: r.users ? { id: r.users.id, email: r.users.email, companyName: r.users.companyName } : null })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.patch("/admin/rfqs/:id/status", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const status = String((req.body as any)?.status ?? "");
  if (!status) { res.status(400).json({ message: "Invalid status" }); return; }
  const [updated] = await db.update(rfqsTable).set({ status: status as any, updatedAt: new Date() }).where(eq(rfqsTable.id, id)).returning();
  if (!updated) { res.status(404).json({ message: "RFQ not found" }); return; }
  res.json(updated);
}));

router.get("/admin/collective-orders", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const { status, page = "1", limit = "50" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(200, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (status) conditions.push(eq(collectiveOrdersTable.status, status));
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(collectiveOrdersTable)
      .leftJoin(suppliersTable, eq(suppliersTable.id, collectiveOrdersTable.supplierId))
      .where(whereClause)
      .orderBy(desc(collectiveOrdersTable.createdAt))
      .limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(collectiveOrdersTable).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    collectiveOrders: rows.map((r: any) => ({ ...r.collective_orders, supplier: r.suppliers })),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.patch("/admin/collective-orders/:id/status", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const status = String((req.body as any)?.status ?? "");
  if (!status) { res.status(400).json({ message: "Invalid status" }); return; }
  const [updated] = await db.update(collectiveOrdersTable).set({ status: status as any, updatedAt: new Date() }).where(eq(collectiveOrdersTable.id, id)).returning();
  if (!updated) { res.status(404).json({ message: "Collective order not found" }); return; }
  res.json(updated);
}));

router.get("/admin/categories", requireAuth, requireRole("admin"), asyncHandler(async (_req, res) => {
  const rows = await db.select().from(categoriesTable).orderBy(desc(categoriesTable.createdAt));
  res.json(rows);
}));

router.post("/admin/categories", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const name = String((req.body as any)?.name ?? "").trim();
  if (!name) { res.status(400).json({ message: "Name is required" }); return; }
  const slug = name.toLowerCase().replace(/\s+/g, "-");
  const [cat] = await db
    .insert(categoriesTable)
    .values({ name, nameAr: name, slug, iconUrl: null })
    .returning();
  res.status(201).json(cat);
}));

router.patch("/admin/categories/:id", requireAuth, requireRole("admin"), asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const updates: Record<string, any> = {};
  for (const key of ["name", "nameAr", "slug", "iconUrl"] as const) {
    if ((req.body as any)[key] !== undefined) updates[key] = (req.body as any)[key];
  }
  const [updated] = await db.update(categoriesTable).set(updates).where(eq(categoriesTable.id, id)).returning();
  if (!updated) { res.status(404).json({ message: "Category not found" }); return; }
  res.json(updated);
}));

export default router;
