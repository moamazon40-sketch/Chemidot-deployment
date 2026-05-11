import { Router } from "express";
import multer from "multer";
import { db } from "@workspace/db";
import {
  productsTable, suppliersTable, categoriesTable
} from "@workspace/db";
import { eq, and, or, gte, lte, sql, desc, asc, ilike } from "drizzle-orm";
import { requireAuth, requireCanSell, optionalAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { CreateProductBody, UpdateProductBody } from "@workspace/api-zod";
import { canSupplierAccessRfqs, hasReachedProductLimit, isSupplierSuspended } from "../lib/subscriptions";

const router = Router();
const parseProductRequest = multer().none();

function parseOptionalStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    if (trimmed.startsWith("[")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed.map(String) : undefined;
      } catch {
        return undefined;
      }
    }
    return [trimmed];
  }
  return undefined;
}

function parseOptionalJsonArray<T>(value: unknown): T[] | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (Array.isArray(value)) return value as T[];
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed as T[] : undefined;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function parseOptionalNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function parseOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value === "true") return true;
    if (value === "false") return false;
  }
  return undefined;
}

function normalizeCreateProductBody(body: Record<string, unknown>) {
  return {
    ...body,
    categoryId: parseOptionalNumber(body.categoryId),
    moq: parseOptionalNumber(body.moq),
    basePrice: parseOptionalNumber(body.basePrice),
    collectiveEligible: parseOptionalBoolean(body.collectiveEligible),
    images: parseOptionalStringArray(body.images),
    applications: parseOptionalStringArray(body.applications),
    technicalSpecs: parseOptionalJsonArray(body.technicalSpecs),
    pricingTiers: parseOptionalJsonArray(body.pricingTiers),
  };
}

function normalizeUpdateProductBody(body: Record<string, unknown>) {
  return {
    ...body,
    categoryId: parseOptionalNumber(body.categoryId),
    moq: parseOptionalNumber(body.moq),
    basePrice: parseOptionalNumber(body.basePrice),
    collectiveEligible: parseOptionalBoolean(body.collectiveEligible),
    images: parseOptionalStringArray(body.images),
    applications: parseOptionalStringArray(body.applications),
    technicalSpecs: parseOptionalJsonArray(body.technicalSpecs),
    pricingTiers: parseOptionalJsonArray(body.pricingTiers),
  };
}

function getDbErrorMessage(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const detail = "detail" in error ? String((error as { detail?: unknown }).detail ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";

  if (code === "23503") return "The selected category or supplier does not exist.";
  if (code === "23502") return "A required product field is missing.";
  if (code === "22P02") return "One of the product fields has an invalid value.";
  if (code === "23505") return "A product with the same unique value already exists.";

  return detail || message || null;
}

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
    images: p.images ?? [],
    technicalSpecs: p.technicalSpecs ?? [],
    pricingTiers: p.pricingTiers ?? [],
    applications: p.applications ?? [],
    packaging: p.packaging,
    countryOfOrigin: p.countryOfOrigin,
    sdsDocumentUrl: p.sdsDocumentUrl,
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
    .where(and(
      eq(productsTable.featured, true),
      eq(suppliersTable.storefrontVisible, true),
      eq(suppliersTable.productsPublic, true),
    ))
    .limit(8);

  res.json(rows.map(r => buildProductShape(r.products, r.suppliers, r.categories, 0, null)));
}));

router.get("/products/trending", asyncHandler(async (_req, res) => {
  const recentProducts = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(and(
      eq(suppliersTable.storefrontVisible, true),
      eq(suppliersTable.productsPublic, true),
    ))
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
  if (minPrice) conditions.push(gte(productsTable.basePrice, String(minPrice)));
  if (maxPrice) conditions.push(lte(productsTable.basePrice, String(maxPrice)));
  if (country) conditions.push(eq(suppliersTable.country, String(country)));
  if (verifiedSupplier === "true") conditions.push(eq(suppliersTable.verified, true));
  if (collectiveEligible === "true") conditions.push(eq(productsTable.collectiveEligible, true));
  conditions.push(eq(suppliersTable.storefrontVisible, true));
  conditions.push(eq(suppliersTable.productsPublic, true));

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
      .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
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
    .where(and(
      eq(productsTable.id, id),
      eq(suppliersTable.storefrontVisible, true),
      eq(suppliersTable.productsPublic, true),
    ))
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
    .where(and(
      eq(productsTable.categoryId, product.categoryId),
      sql`${productsTable.id} != ${id}`,
      eq(suppliersTable.storefrontVisible, true),
      eq(suppliersTable.productsPublic, true),
    ))
    .limit(6);

  res.json(rows.map(r => buildProductShape(r.products, r.suppliers, r.categories, 0, null)));
}));

router.post("/products", parseProductRequest, requireAuth, requireCanSell, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const parsed = CreateProductBody.safeParse(normalizeCreateProductBody(req.body as Record<string, unknown>));
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
  if (!supplier) {
    res.status(403).json({ message: "Supplier profile not found" });
    return;
  }
  if (isSupplierSuspended(supplier)) {
    res.status(403).json({ message: "Your supplier account is currently suspended. Please contact Chemidot support to reactivate your storefront." });
    return;
  }
  const [countRow] = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(productsTable).where(eq(productsTable.supplierId, supplier.id));
  const productCount = countRow?.count ?? 0;
  if (hasReachedProductLimit(supplier, productCount)) {
    res.status(403).json({ message: "You have reached your product limit for the current plan. Please upgrade to publish more products." });
    return;
  }
  const body = parsed.data;
  const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, body.categoryId)).limit(1);
  if (!category) {
    res.status(400).json({ message: "Selected category does not exist" });
    return;
  }

  let product;
  try {
    [product] = await db.insert(productsTable).values({
      supplierId: supplier.id,
      categoryId: body.categoryId,
      name: body.name.trim(),
      casNumber: body.casNumber?.trim() || null,
      description: body.description.trim(),
      imageUrl: body.imageUrl?.trim() || null,
      images: body.images ?? [],
      moq: String(body.moq),
      moqUnit: body.moqUnit.trim(),
      basePrice: body.basePrice !== undefined ? String(body.basePrice) : null,
      currency: body.currency.trim() || "USD",
      availability: body.availability,
      deliveryLeadTime: body.deliveryLeadTime.trim(),
      collectiveEligible: body.collectiveEligible ?? false,
      countryOfOrigin: body.countryOfOrigin.trim(),
      packaging: body.packaging?.trim() || null,
      technicalSpecs: body.technicalSpecs ?? [],
      pricingTiers: body.pricingTiers ?? [],
      applications: body.applications ?? [],
    }).returning();
  } catch (error) {
    req.log.error({
      err: error,
      userId: user.id,
      supplierId: supplier.id,
      categoryId: body.categoryId,
      route: "POST /api/products",
    }, "Product creation failed");

    const message = getDbErrorMessage(error);
    if (message) {
      res.status(400).json({ message });
      return;
    }

    throw error;
  }

  const [row] = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, product.id)).limit(1);

  res.status(201).json(buildProductShape(row.products, row.suppliers, row.categories, 0, null));
}));

router.put("/products/:id", requireAuth, requireCanSell, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = UpdateProductBody.safeParse(normalizeUpdateProductBody(req.body as Record<string, unknown>));
  if (!parsed.success) {
    res.status(400).json({
      message: "Invalid request body",
      issues: parsed.error.issues.map((issue) => ({
        path: issue.path.join("."),
        message: issue.message,
      })),
    });
    return;
  }

  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
  if (!supplier) {
    res.status(403).json({ message: "Supplier profile not found" });
    return;
  }
  if (isSupplierSuspended(supplier)) {
    res.status(403).json({ message: "Your supplier account is currently suspended. Please contact Chemidot support to reactivate your storefront." });
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
  if (body.categoryId !== undefined) {
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, body.categoryId)).limit(1);
    if (!category) {
      res.status(400).json({ message: "Selected category does not exist" });
      return;
    }
    updates.categoryId = body.categoryId;
  }
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.description !== undefined) updates.description = body.description.trim();
  if (body.casNumber !== undefined) updates.casNumber = body.casNumber?.trim() || null;
  if (body.imageUrl !== undefined) updates.imageUrl = body.imageUrl?.trim() || null;
  if (body.images !== undefined) updates.images = body.images;
  if (body.moq !== undefined) updates.moq = String(body.moq);
  if (body.moqUnit !== undefined) updates.moqUnit = body.moqUnit.trim();
  if (body.basePrice !== undefined) updates.basePrice = body.basePrice === null ? null : String(body.basePrice);
  if (body.currency !== undefined) updates.currency = body.currency.trim() || "USD";
  if (body.availability !== undefined) updates.availability = body.availability;
  if (body.deliveryLeadTime !== undefined) updates.deliveryLeadTime = body.deliveryLeadTime.trim();
  if (body.collectiveEligible !== undefined) updates.collectiveEligible = body.collectiveEligible;
  if (body.countryOfOrigin !== undefined) updates.countryOfOrigin = body.countryOfOrigin.trim();
  if (body.packaging !== undefined) updates.packaging = body.packaging?.trim() || null;
  if (body.technicalSpecs !== undefined) updates.technicalSpecs = body.technicalSpecs;
  if (body.pricingTiers !== undefined) updates.pricingTiers = body.pricingTiers;
  if (body.applications !== undefined) updates.applications = body.applications;
  updates.updatedAt = new Date();

  try {
    await db.update(productsTable).set(updates).where(eq(productsTable.id, id));
  } catch (error) {
    req.log.error({
      err: error,
      userId: user.id,
      supplierId: supplier.id,
      productId: id,
      route: "PUT /api/products/:id",
    }, "Product update failed");

    const message = getDbErrorMessage(error);
    if (message) {
      res.status(400).json({ message });
      return;
    }

    throw error;
  }

  const [row] = await db.select().from(productsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, productsTable.supplierId))
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.id, id)).limit(1);

  if (!row) { res.status(404).json({ message: "Not found" }); return; }
  res.json(buildProductShape(row.products, row.suppliers, row.categories, 0, null));
}));

router.delete("/products/:id", requireAuth, asyncHandler(async (req, res) => {
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
