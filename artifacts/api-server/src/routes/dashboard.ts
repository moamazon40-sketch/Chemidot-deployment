import { Router } from "express";
import { db } from "@workspace/db";
import {
  rfqsTable, ordersTable, collectiveOrderParticipantsTable,
  productsTable, suppliersTable, usersTable, messagesTable, conversationsTable,
  collectiveOrdersTable, notificationsTable, quotationsTable
} from "@workspace/db";
import { eq, and, sql, desc, gte, inArray, or, ilike, ne } from "drizzle-orm";
import { canUserBuy, requireAuth, requireCanSell } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { hasReachedProductLimit } from "../lib/subscriptions";

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

async function getSupplierActiveRfqCount(supplier: typeof suppliersTable.$inferSelect | undefined) {
  if (!supplier) return 0;

  const supplierProducts = await db.select({
    name: productsTable.name,
    casNumber: productsTable.casNumber,
    categoryId: productsTable.categoryId,
  }).from(productsTable).where(eq(productsTable.supplierId, supplier.id));

  if (supplierProducts.length === 0) return 0;

  const matchConditions: any[] = [];
  const categoryIds = [...new Set(supplierProducts.map((product) => product.categoryId).filter(Boolean))];

  if (categoryIds.length > 0) {
    matchConditions.push(inArray(rfqsTable.categoryId, categoryIds as number[]));
  }

  if (supplier.country) {
    matchConditions.push(eq(rfqsTable.deliveryDestination, supplier.country));
  }

  for (const product of supplierProducts) {
    if (product.name) {
      const escapedName = product.name.replace(/[%_\\]/g, "\\$&");
      matchConditions.push(ilike(rfqsTable.productName, `%${escapedName}%`));
    }
    if (product.casNumber) {
      matchConditions.push(eq(rfqsTable.casNumber, product.casNumber));
    }
  }

  if (matchConditions.length === 0) return 0;

  const productMatchConditions = matchConditions.filter((condition) =>
    condition.toString().includes("productName") || condition.toString().includes("casNumber")
  );
  const allConditions = [
    eq(rfqsTable.status, "active"),
    categoryIds.length > 0 ? inArray(rfqsTable.categoryId, categoryIds as number[]) : undefined,
    supplier.country ? eq(rfqsTable.deliveryDestination, supplier.country) : undefined,
    productMatchConditions.length > 0 ? or(...productMatchConditions) : undefined,
  ].filter(Boolean) as any[];

  const [result] = await db.select({ count: sql<number>`cast(count(*) as int)` })
    .from(rfqsTable)
    .where(and(...allConditions));

  return result?.count ?? 0;
}

router.get("/dashboard/buyer-stats", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  if (!canUserBuy(user)) {
    res.status(403).json({ message: "Buying capability is required for this view." });
    return;
  }

  const [rfqCount, orderCount, collectiveJoined, unreadMsgs] = await Promise.all([
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(rfqsTable).where(eq(rfqsTable.buyerId, user.id)),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(ordersTable).where(eq(ordersTable.buyerId, user.id)),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(collectiveOrderParticipantsTable).where(eq(collectiveOrderParticipantsTable.buyerId, user.id)),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(messagesTable)
      .leftJoin(conversationsTable, eq(conversationsTable.id, messagesTable.conversationId))
      .where(and(
        eq(messagesTable.isRead, false),
        ne(messagesTable.senderId, user.id),
        or(eq(conversationsTable.buyerId, user.id), eq(conversationsTable.supplierId, user.id)),
      )),
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

router.get("/dashboard/supplier-stats", requireAuth, requireCanSell, asyncHandler(async (req, res) => {
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

  const activeRfqs = await getSupplierActiveRfqCount(supplier);
  const unreadMessages = supplier
    ? (await db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(messagesTable)
      .leftJoin(conversationsTable, eq(conversationsTable.id, messagesTable.conversationId))
      .where(and(
        eq(messagesTable.isRead, false),
        ne(messagesTable.senderId, user.id),
        eq(conversationsTable.supplierId, user.id),
      )))[0]?.count ?? 0
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
  let revenueByMonth: { month: string; value: number; orders: number }[] = [];
  if (supplier) {
    const revenueRows = await db.select({
      month: sql<number>`extract(month from ${ordersTable.createdAt})`,
      year: sql<number>`extract(year from ${ordersTable.createdAt})`,
      total: sql<number>`cast(coalesce(sum(total_price), 0) as float)`,
      orders: sql<number>`cast(count(*) as int)`,
    }).from(ordersTable)
      .where(and(
        eq(ordersTable.supplierId, supplier.id),
        gte(ordersTable.createdAt, new Date(months[0].year, months[0].monthNum, 1))
      ))
      .groupBy(sql`extract(year from ${ordersTable.createdAt})`, sql`extract(month from ${ordersTable.createdAt})`);

    revenueByMonth = months.map(m => {
      const row = revenueRows.find(r => Number(r.month) === m.monthNum + 1 && Number(r.year) === m.year);
      return {
        month: m.month,
        value: row ? Number(row.total) : 0,
        orders: row ? Number(row.orders) : 0,
      };
    });
  }

  const currentMonthRevenue = revenueByMonth.at(-1)?.value ?? 0;

  res.json({
    totalProducts: productCount,
    activeRfqs,
    totalOrders: orderCount,
    pendingOrders,
    totalRevenue: revenue,
    monthlyRevenue: currentMonthRevenue,
    responseRate: parseFloat(supplier?.responseRate ?? "0"),
    avgResponseTime: supplier?.avgResponseTime ?? "N/A",
    supplierPlan: supplier?.supplierPlan ?? "trial",
    subscriptionStatus: supplier?.subscriptionStatus ?? "trial",
    trialEndsAt: supplier?.trialEndsAt ? supplier.trialEndsAt.toISOString() : null,
    gracePeriodEndsAt: supplier?.gracePeriodEndsAt ? supplier.gracePeriodEndsAt.toISOString() : null,
    subscriptionStartedAt: supplier?.subscriptionStartedAt ? supplier.subscriptionStartedAt.toISOString() : null,
    subscriptionRenewalDate: supplier?.subscriptionRenewalDate ? supplier.subscriptionRenewalDate.toISOString() : null,
    billingCycle: supplier?.billingCycle ?? "monthly",
    productLimit: supplier?.productLimit ?? 3,
    productsPublic: supplier?.productsPublic ?? true,
    storefrontVisible: supplier?.storefrontVisible ?? true,
    rfqAccessEnabled: supplier?.rfqAccessEnabled ?? true,
    hasReachedProductLimit: hasReachedProductLimit(supplier, productCount),
    unreadMessages,
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
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(productsTable)
      .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
      .where(and(eq(suppliersTable.storefrontVisible, true), eq(suppliersTable.productsPublic, true))),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(suppliersTable).where(eq(suppliersTable.storefrontVisible, true)),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(usersTable).where(eq(usersTable.canBuy, true)),
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
