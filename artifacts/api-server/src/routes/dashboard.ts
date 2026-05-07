import { Router } from "express";
import { db } from "@workspace/db";
import {
  rfqsTable, ordersTable, collectiveOrderParticipantsTable,
  productsTable, suppliersTable, usersTable, messagesTable,
  collectiveOrdersTable, notificationsTable, quotationsTable
} from "@workspace/db";
import { eq, and, sql, desc, gte } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getLast6Months(): { month: string; year: number; monthNum: number }[] {
  const result = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    result.push({ month: MONTH_NAMES[d.getMonth()], year: d.getFullYear(), monthNum: d.getMonth() });
  }
  return result;
}

router.get("/dashboard/buyer-stats", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;

  const [rfqCount, orderCount, collectiveJoined, unreadMsgs] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(rfqsTable).where(eq(rfqsTable.buyerId, user.id)),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(ordersTable).where(eq(ordersTable.buyerId, user.id)),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(collectiveOrderParticipantsTable).where(eq(collectiveOrderParticipantsTable.buyerId, user.id)),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(messagesTable).where(and(eq(messagesTable.isRead, false), sql`${messagesTable.senderId} != ${user.id}`)),
  ]);

  const activeRfqs = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(rfqsTable).where(and(eq(rfqsTable.buyerId, user.id), eq(rfqsTable.status, "active")));
  const pendingOrders = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(ordersTable).where(and(eq(ordersTable.buyerId, user.id), eq(ordersTable.status, "pending")));

  const totalSpent = await db.select({ total: sql<number>`cast(coalesce(sum(total_price), 0) as float)` }).from(ordersTable).where(eq(ordersTable.buyerId, user.id));

  const recentNotifications = await db.select().from(notificationsTable)
    .where(eq(notificationsTable.userId, user.id))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(6);

  const recentOrders = await db.select({
    productName: ordersTable.productName,
    totalPrice: ordersTable.totalPrice,
    status: ordersTable.status,
    createdAt: ordersTable.createdAt,
  }).from(ordersTable)
    .where(eq(ordersTable.buyerId, user.id))
    .orderBy(desc(ordersTable.createdAt))
    .limit(6);

  const recentActivity: { description: string; createdAt: string }[] = [];
  for (const n of recentNotifications) {
    recentActivity.push({
      description: n.message,
      createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : String(n.createdAt),
    });
  }
  for (const o of recentOrders) {
    recentActivity.push({
      description: `Order for ${o.productName} — ${o.status}`,
      createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
    });
  }
  recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const months = getLast6Months();
  const monthlySpendRows = await db.select({
    month: sql<number>`extract(month from ${ordersTable.createdAt})`,
    year: sql<number>`extract(year from ${ordersTable.createdAt})`,
    total: sql<number>`cast(coalesce(sum(total_price), 0) as float)`,
  }).from(ordersTable)
    .where(and(
      eq(ordersTable.buyerId, user.id),
      gte(ordersTable.createdAt, new Date(months[0].year, months[0].monthNum, 1))
    ))
    .groupBy(sql`extract(year from ${ordersTable.createdAt})`, sql`extract(month from ${ordersTable.createdAt})`);

  const monthlySpend = months.map(m => {
    const row = monthlySpendRows.find(r => Number(r.month) === m.monthNum + 1 && Number(r.year) === m.year);
    return { month: m.month, value: row ? Number(row.total) : 0 };
  });

  res.json({
    totalRfqs: rfqCount[0]?.count ?? 0,
    activeRfqs: activeRfqs[0]?.count ?? 0,
    totalOrders: orderCount[0]?.count ?? 0,
    pendingOrders: pendingOrders[0]?.count ?? 0,
    collectiveOrdersJoined: collectiveJoined[0]?.count ?? 0,
    totalSavings: 0,
    unreadMessages: unreadMsgs[0]?.count ?? 0,
    savedSuppliers: 0,
    recentActivity: recentActivity.slice(0, 6),
    monthlySpend,
  });
}));

router.get("/dashboard/supplier-stats", requireAuth, requireRole("supplier", "admin"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);

  let productCount = 0;
  let orderCount = 0;
  let revenue = 0;

  if (supplier) {
    const [pc, oc, rev] = await Promise.all([
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(productsTable).where(eq(productsTable.supplierId, supplier.id)),
      db.select({ count: sql<number>`cast(count(*) as int)` }).from(ordersTable).where(eq(ordersTable.supplierId, supplier.id)),
      db.select({ total: sql<number>`cast(coalesce(sum(total_price), 0) as float)` }).from(ordersTable).where(and(eq(ordersTable.supplierId, supplier.id), eq(ordersTable.status, "delivered"))),
    ]);
    productCount = pc[0]?.count ?? 0;
    orderCount = oc[0]?.count ?? 0;
    revenue = rev[0]?.total ?? 0;
  }

  const topProducts = supplier ? await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .where(eq(productsTable.supplierId, supplier.id))
    .limit(5) : [];

  const pendingOrders = supplier
    ? (await db.select({ count: sql<number>`cast(count(*) as int)` }).from(ordersTable).where(and(eq(ordersTable.supplierId, supplier.id), eq(ordersTable.status, "pending"))))[0]?.count ?? 0
    : 0;

  const activeRfqs = supplier
    ? (await db.select({ count: sql<number>`cast(count(*) as int)` }).from(rfqsTable).where(eq(rfqsTable.status, "active")))[0]?.count ?? 0
    : 0;

  const recentActivity: { description: string; createdAt: string }[] = [];
  if (supplier) {
    const recentOrders = await db.select({
      productName: ordersTable.productName,
      totalPrice: ordersTable.totalPrice,
      status: ordersTable.status,
      createdAt: ordersTable.createdAt,
    }).from(ordersTable)
      .where(eq(ordersTable.supplierId, supplier.id))
      .orderBy(desc(ordersTable.createdAt))
      .limit(4);

    for (const o of recentOrders) {
      recentActivity.push({
        description: `Order: ${o.productName} — $${Number(o.totalPrice || 0).toLocaleString()} (${o.status})`,
        createdAt: o.createdAt instanceof Date ? o.createdAt.toISOString() : String(o.createdAt),
      });
    }

    const recentQuotes = await db.select({
      rfqId: quotationsTable.rfqId,
      status: quotationsTable.status,
      createdAt: quotationsTable.createdAt,
    }).from(quotationsTable)
      .where(eq(quotationsTable.supplierId, supplier.id))
      .orderBy(desc(quotationsTable.createdAt))
      .limit(4);

    for (const q of recentQuotes) {
      recentActivity.push({
        description: `Quotation for RFQ #${q.rfqId} — ${q.status}`,
        createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : String(q.createdAt),
      });
    }

    recentActivity.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const months = getLast6Months();
  let revenueByMonth: { month: string; value: number }[] = [];
  if (supplier) {
    const revenueRows = await db.select({
      month: sql<number>`extract(month from ${ordersTable.createdAt})`,
      year: sql<number>`extract(year from ${ordersTable.createdAt})`,
      total: sql<number>`cast(coalesce(sum(total_price), 0) as float)`,
    }).from(ordersTable)
      .where(and(
        eq(ordersTable.supplierId, supplier.id),
        gte(ordersTable.createdAt, new Date(months[0].year, months[0].monthNum, 1))
      ))
      .groupBy(sql`extract(year from ${ordersTable.createdAt})`, sql`extract(month from ${ordersTable.createdAt})`);

    revenueByMonth = months.map(m => {
      const row = revenueRows.find(r => Number(r.month) === m.monthNum + 1 && Number(r.year) === m.year);
      return { month: m.month, value: row ? Number(row.total) : 0 };
    });
  }

  res.json({
    totalProducts: productCount,
    activeRfqs,
    totalOrders: orderCount,
    pendingOrders,
    totalRevenue: revenue,
    monthlyRevenue: 0,
    responseRate: parseFloat(supplier?.responseRate ?? "0"),
    avgResponseTime: supplier?.avgResponseTime ?? "N/A",
    unreadMessages: 0,
    recentActivity: recentActivity.slice(0, 6),
    revenueByMonth,
    topProducts: topProducts.map(r => ({
      id: r.products.id,
      name: r.products.name,
      casNumber: r.products.casNumber,
      description: r.products.description,
      categoryId: r.products.categoryId,
      categoryName: "",
      supplierId: r.products.supplierId,
      supplierName: r.suppliers?.companyName ?? "",
      supplierVerified: r.suppliers?.verified ?? false,
      supplierCountry: r.suppliers?.country ?? "",
      imageUrl: r.products.imageUrl,
      moq: parseFloat(r.products.moq),
      moqUnit: r.products.moqUnit,
      basePrice: r.products.basePrice ? parseFloat(r.products.basePrice) : null,
      currency: r.products.currency,
      availability: r.products.availability,
      deliveryLeadTime: r.products.deliveryLeadTime,
      collectiveEligible: r.products.collectiveEligible,
      rating: null,
      reviewCount: 0,
      createdAt: r.products.createdAt.toISOString(),
    })),
  });
}));

router.get("/dashboard/marketplace-stats", asyncHandler(async (_req, res) => {
  const [products, suppliers, buyers, collectiveActive, totalOrders] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(productsTable),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(suppliersTable),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(usersTable).where(eq(usersTable.role, "buyer")),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(collectiveOrdersTable).where(eq(collectiveOrdersTable.status, "open")),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(ordersTable),
  ]);

  res.json({
    totalProducts: products[0]?.count ?? 0,
    totalSuppliers: suppliers[0]?.count ?? 0,
    totalBuyers: buyers[0]?.count ?? 0,
    totalTransactions: totalOrders[0]?.count ?? 0,
    countriesServed: 6,
    activeCollectiveOrders: collectiveActive[0]?.count ?? 0,
  });
}));

export default router;
