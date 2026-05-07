import { Router } from "express";
import { db } from "@workspace/db";
import {
  productsTable, suppliersTable, categoriesTable, reviewsTable
} from "@workspace/db";
import { eq, and, or, like, gte, lte, sql, desc, asc, ilike } from "drizzle-orm";
import { requireAuth, requireRole, optionalAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { CreateProductBody, UpdateProductBody } from "@workspace/api-zod";

const router = Router();

function buildProductShape(p: any, s: any, c: any, reviewCount: number, rating: number | null) {
  return {
    id: p.id,
    name: p.name,
    casNumber: p.casNumber,
    description: p.description,
    categoryId: p.categoryId,
    categoryName: c?.name ?? "",
    supplierId: s?.id ?? p.supplierId,
    supplierName: s?.companyName ?? "",
    supplierVerified: s?.verified ?? false,
    supplierCountry: s?.country ?? "",
    imageUrl: p.imageUrl,
    moq: parseFloat(p.moq),
    moqUnit: p.moqUnit,
    basePrice: p.basePrice ? parseFloat(p.basePrice) : null,
    currency: p.currency,
    availability: p.availability,
    deliveryLeadTime: p.deliveryLeadTime,
    collectiveEligible: p.collectiveEligible,
    rating,
    reviewCount,
    createdAt: p.createdAt.toISOString(),
  };
}

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

router.get("/products/featured", asyncHandler(async (_req, res) => {
  const rows = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.featured, true))
    .limit(8);

  res.json(rows.map(r => buildProductShape(r.products, r.suppliers, r.categories, 0, null)));
}));

router.get("/products/trending", asyncHandler(async (_req, res) => {
  const recentProducts = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .orderBy(desc(productsTable.createdAt))
    .limit(6);

  const cats = await db.select({
    id: categoriesTable.id,
    name: categoriesTable.name,
    nameAr: categoriesTable.nameAr,
    slug: categoriesTable.slug,
    iconUrl: categoriesTable.iconUrl,
    productCount: sql<number>`cast(count(${productsTable.id}) as int)`,
  })
  .from(categoriesTable)
  .leftJoin(productsTable, eq(productsTable.categoryId, categoriesTable.id))
  .groupBy(categoriesTable.id)
  .orderBy(sql`count(${productsTable.id}) desc`)
  .limit(6);

  res.json({
    trendingSearches: ["Sodium Hydroxide", "Ethylene", "Sulfuric Acid", "Methanol", "Polyethylene", "Urea"],
    popularCategories: cats,
    recommendedProducts: recentProducts.map(r => buildProductShape(r.products, r.suppliers, r.categories, 0, null)),
  });
}));

router.get("/products", optionalAuth, asyncHandler(async (req, res) => {
  const {
    search, categoryId, supplierId, country, minMoq, maxMoq, minPrice, maxPrice,
    collectiveEligible, verifiedSupplier, page = "1", limit = "20", sortBy
  } = req.query as any;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (search) {
    const s = sanitizeSearch(search);
    // Enhanced CAS number search - prioritize exact CAS matches
    conditions.push(or(
      // Exact CAS number match (highest priority)
      eq(productsTable.casNumber, s),
      // Product name match (medium priority)
      ilike(productsTable.name, `%${s}%`),
      // Partial CAS number match (lowest priority)
      ilike(productsTable.casNumber, `%${s}%`)
    )!);
  }
  if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId)));
  if (supplierId) conditions.push(eq(productsTable.supplierId, parseInt(supplierId)));
  if (minMoq) conditions.push(gte(productsTable.moq, minMoq));
  if (maxMoq) conditions.push(lte(productsTable.moq, maxMoq));
  if (collectiveEligible === "true") conditions.push(eq(productsTable.collectiveEligible, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  let orderByClause: any = desc(productsTable.createdAt);
  if (sortBy === "price_asc") orderByClause = asc(productsTable.basePrice);
  else if (sortBy === "price_desc") orderByClause = desc(productsTable.basePrice);
  else if (sortBy === "moq_asc") orderByClause = asc(productsTable.moq);

  const [rows, countResult] = await Promise.all([
    db.select().from(productsTable)
      .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(whereClause)
      .orderBy(orderByClause)
      .limit(limitNum)
      .offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(productsTable)
      .where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    products: rows.map(r => buildProductShape(r.products, r.suppliers, r.categories, 0, null)),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.get("/products/:id", optionalAuth, asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const rows = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, id))
    .limit(1);

  if (!rows[0]) {
    res.status(404).json({ message: "Product not found" });
    return;
  }

  const { products: p, suppliers: s, categories: c } = rows[0];
  const base = buildProductShape(p, s, c, 0, null);
  const supplier = s ? {
    id: s.id,
    companyName: s.companyName,
    logoUrl: s.logoUrl,
    country: s.country,
    verified: s.verified,
    certifications: s.certifications,
    productCount: 0,
    responseRate: parseFloat(s.responseRate),
    avgResponseTime: s.avgResponseTime,
    yearsInBusiness: s.yearsInBusiness,
    rating: null,
  } : null;

  res.json({
    ...base,
    images: p.images ?? [],
    technicalSpecs: p.technicalSpecs ?? [],
    pricingTiers: (p.pricingTiers as any[]).map((t: any) => ({
      minQuantity: t.minQuantity,
      maxQuantity: t.maxQuantity ?? null,
      pricePerUnit: t.pricePerUnit,
      discountPercent: t.discountPercent,
    })),
    applications: p.applications ?? [],
    packaging: p.packaging,
    countryOfOrigin: p.countryOfOrigin,
    sdsDocumentUrl: p.sdsDocumentUrl,
    supplier,
  });
}));

router.get("/products/:id/related", asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [product] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!product) {
    res.json([]);
    return;
  }
  const rows = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(and(eq(productsTable.categoryId, product.categoryId), sql`${productsTable.id} != ${id}`))
    .limit(6);

  res.json(rows.map(r => buildProductShape(r.products, r.suppliers, r.categories, 0, null)));
}));

router.post("/products", requireAuth, requireRole("supplier"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
  if (!supplier) {
    res.status(403).json({ message: "Supplier profile not found" });
    return;
  }
  const body = parsed.data;
  const [product] = await db.insert(productsTable).values({
    supplierId: supplier.id,
    categoryId: body.categoryId,
    name: body.name,
    casNumber: body.casNumber,
    description: body.description,
    imageUrl: body.imageUrl,
    images: body.images ?? [],
    moq: String(body.moq),
    moqUnit: body.moqUnit,
    basePrice: body.basePrice ? String(body.basePrice) : null,
    currency: body.currency ?? "USD",
    availability: body.availability,
    deliveryLeadTime: body.deliveryLeadTime,
    collectiveEligible: body.collectiveEligible ?? false,
    countryOfOrigin: body.countryOfOrigin,
    packaging: body.packaging,
    technicalSpecs: body.technicalSpecs ?? [],
    pricingTiers: body.pricingTiers ?? [],
    applications: body.applications ?? [],
  }).returning();

  const [row] = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, product.id)).limit(1);

  res.status(201).json(buildProductShape(row.products, row.suppliers, row.categories, 0, null));
}));

router.put("/products/:id", requireAuth, requireRole("supplier"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = UpdateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }

  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
  if (!supplier) {
    res.status(403).json({ message: "Supplier profile not found" });
    return;
  }

  const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ message: "Product not found" });
    return;
  }
  if (existing.supplierId !== supplier.id) {
    res.status(403).json({ message: "You can only edit your own products" });
    return;
  }

  const updates: any = {};
  const body = parsed.data;
  if (body.name) updates.name = body.name;
  if (body.description) updates.description = body.description;
  if (body.moq) updates.moq = String(body.moq);
  if (body.basePrice) updates.basePrice = String(body.basePrice);
  if (body.availability) updates.availability = body.availability;
  if (body.deliveryLeadTime) updates.deliveryLeadTime = body.deliveryLeadTime;
  if (body.collectiveEligible !== undefined) updates.collectiveEligible = body.collectiveEligible;
  updates.updatedAt = new Date();

  await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
  const [row] = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, id)).limit(1);

  if (!row) { res.status(404).json({ message: "Not found" }); return; }
  res.json(buildProductShape(row.products, row.suppliers, row.categories, 0, null));
}));

router.delete("/products/:id", requireAuth, requireRole("supplier", "admin"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));

  if (user.role !== "admin") {
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
    if (!supplier) {
      res.status(403).json({ message: "Supplier profile not found" });
      return;
    }
    const [existing] = await db.select().from(productsTable).where(eq(productsTable.id, id)).limit(1);
    if (!existing) {
      res.status(404).json({ message: "Product not found" });
      return;
    }
    if (existing.supplierId !== supplier.id) {
      res.status(403).json({ message: "You can only delete your own products" });
      return;
    }
  }

  await db.delete(productsTable).where(eq(productsTable.id, id));
  res.json({ message: "Product deleted" });
}));

export default router;
