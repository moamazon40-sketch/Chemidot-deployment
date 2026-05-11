import { Router } from "express";
import { db } from "@workspace/db";
import {
  suppliersTable,
  usersTable,
  productsTable,
  categoriesTable,
  supplierBrandsTable,
  supplierDocumentsTable,
  supplierExpertsTable,
} from "@workspace/db";
import { eq, ilike, and, sql, desc } from "drizzle-orm";
import { optionalAuth, requireAuth, requireCanSell } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import path from "path";
import fs from "fs";
import multer from "multer";
import { hasReachedProductLimit } from "../lib/subscriptions";

const router = Router();

const primaryUploadDir = path.join(process.cwd(), "public", "uploads");
const tmpUploadDir = "/tmp/uploads";
let uploadDir =
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.AWS_LAMBDA_FUNCTION_NAME
    ? tmpUploadDir
    : primaryUploadDir;

// Vercel Functions run from a read-only filesystem (/var/task). Only /tmp is writable.
try {
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
} catch {
  uploadDir = tmpUploadDir;
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
}

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "application/pdf",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".webp", ".gif", ".pdf",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    cb(null, safeName);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  const ext = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_MIME_TYPES.has(file.mimetype) || !ALLOWED_EXTENSIONS.has(ext)) {
    cb(new Error("Only JPEG, PNG, WebP, GIF images and PDF files are allowed"));
    return;
  }
  cb(null, true);
}

const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter });

function buildSupplier(s: any) {
  return {
    id: s.id,
    companyName: s.companyName,
    logoUrl: s.logoUrl,
    coverUrl: s.coverUrl ?? null,
    country: s.country,
    verified: s.verified,
    certifications: s.certifications ?? [],
    productCount: 0,
    responseRate: parseFloat(s.responseRate ?? "0"),
    avgResponseTime: s.avgResponseTime,
    yearsInBusiness: s.yearsInBusiness,
    rating: null,
    supplierPlan: s.supplierPlan,
    subscriptionStatus: s.subscriptionStatus,
    trialEndsAt: s.trialEndsAt ? s.trialEndsAt.toISOString() : null,
    gracePeriodEndsAt: s.gracePeriodEndsAt ? s.gracePeriodEndsAt.toISOString() : null,
    subscriptionStartedAt: s.subscriptionStartedAt ? s.subscriptionStartedAt.toISOString() : null,
    subscriptionRenewalDate: s.subscriptionRenewalDate ? s.subscriptionRenewalDate.toISOString() : null,
    billingCycle: s.billingCycle,
    featuredSupplier: s.featuredSupplier,
    productLimit: s.productLimit,
    rfqAccessEnabled: s.rfqAccessEnabled,
    storefrontVisible: s.storefrontVisible,
    productsPublic: s.productsPublic,
  };
}

function sanitizeSearch(input: string): string {
  return input.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

async function getSupplierProfileByUserId(userId: number) {
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, userId)).limit(1);
  if (!supplier) return null;

  const [brands, documents, experts, products] = await Promise.all([
    db.select().from(supplierBrandsTable).where(eq(supplierBrandsTable.supplierId, supplier.id)),
    db.select().from(supplierDocumentsTable).where(eq(supplierDocumentsTable.supplierId, supplier.id)),
    db.select().from(supplierExpertsTable).where(eq(supplierExpertsTable.supplierId, supplier.id)),
    db.select().from(productsTable)
      .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
      .where(eq(productsTable.supplierId, supplier.id))
      .orderBy(desc(productsTable.createdAt))
      .limit(50),
  ]);

  return {
    ...buildSupplier(supplier),
    id: supplier.id,
    userId: supplier.userId,
    description: supplier.description,
    warehouseLocation: supplier.warehouseLocation,
    commercialRegNumber: supplier.commercialRegNumber,
    internalAdminNotes: supplier.internalAdminNotes,
    productCount: products.length,
    hasReachedProductLimit: hasReachedProductLimit(supplier, products.length),
    brands: brands.map((brand) => ({
      id: brand.id,
      supplierId: brand.supplierId,
      name: brand.name,
      logoUrl: brand.logoUrl,
      description: brand.description,
      createdAt: brand.createdAt instanceof Date ? brand.createdAt.toISOString() : String(brand.createdAt),
    })),
    documents: documents.map((document) => ({
      id: document.id,
      supplierId: document.supplierId,
      title: document.title,
      type: document.type,
      fileUrl: document.fileUrl,
      fileSize: document.fileSize,
      createdAt: document.createdAt instanceof Date ? document.createdAt.toISOString() : String(document.createdAt),
    })),
    experts: experts.map((expert) => ({
      id: expert.id,
      supplierId: expert.supplierId,
      name: expert.name,
      title: expert.title,
      email: expert.email,
      avatarUrl: expert.avatarUrl,
      createdAt: expert.createdAt instanceof Date ? expert.createdAt.toISOString() : String(expert.createdAt),
    })),
    products: products.map((r) => ({
      id: r.products.id,
      name: r.products.name,
      casNumber: r.products.casNumber,
      description: r.products.description,
      categoryId: r.products.categoryId,
      categoryName: r.categories?.name ?? "",
      supplierId: supplier.id,
      supplierName: supplier.companyName,
      supplierVerified: supplier.verified,
      supplierCountry: supplier.country,
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
  };
}

router.get("/suppliers/featured", asyncHandler(async (_req, res) => {
  const suppliers = await db.select().from(suppliersTable)
    .where(and(
      eq(suppliersTable.featuredSupplier, true),
      eq(suppliersTable.storefrontVisible, true),
    ))
    .limit(6);
  res.json(suppliers.map(buildSupplier));
}));

router.get("/suppliers", optionalAuth, asyncHandler(async (req, res) => {
  const { search, country, verified, page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (search) conditions.push(ilike(suppliersTable.companyName, `%${sanitizeSearch(search)}%`));
  if (country) conditions.push(eq(suppliersTable.country, country));
  if (verified === "true") conditions.push(eq(suppliersTable.verified, true));
  conditions.push(eq(suppliersTable.storefrontVisible, true));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(suppliersTable).where(whereClause).orderBy(desc(suppliersTable.createdAt)).limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(suppliersTable).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    suppliers: rows.map(buildSupplier),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.get("/suppliers/profile", requireAuth, asyncHandler(async (req: any, res) => {
  const profile = await getSupplierProfileByUserId(req.user.id);
  if (!profile) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  res.json(profile);
}));

router.get("/suppliers/:id", asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [supplier] = await db.select().from(suppliersTable).where(and(
    eq(suppliersTable.id, id),
    eq(suppliersTable.storefrontVisible, true),
  )).limit(1);
  if (!supplier) {
    res.status(404).json({ message: "Supplier not found" });
    return;
  }

  const products = await db.select().from(productsTable)
    .leftJoin(categoriesTable, eq(categoriesTable.id, productsTable.categoryId))
    .where(eq(productsTable.supplierId, id))
    .limit(20);

  const base = buildSupplier(supplier);
  res.json({
    ...base,
    description: supplier.description,
    warehouseLocation: supplier.warehouseLocation,
    products: supplier.productsPublic ? products.map(r => ({
      id: r.products.id,
      name: r.products.name,
      casNumber: r.products.casNumber,
      description: r.products.description,
      categoryId: r.products.categoryId,
      categoryName: r.categories?.name ?? "",
      supplierId: supplier.id,
      supplierName: supplier.companyName,
      supplierVerified: supplier.verified,
      supplierCountry: supplier.country,
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
    })) : [],
  });
}));

router.post("/suppliers/upload-image", requireAuth, requireCanSell, upload.single("image"), asyncHandler(async (req: any, res) => {
  if (!req.file) {
    res.status(400).json({ message: "No file uploaded" });
    return;
  }
  const url = `/api/uploads/${req.file.filename}`;
  res.json({ url });
}));

router.patch("/suppliers/profile", requireAuth, asyncHandler(async (req: any, res) => {
  const userId = req.user.id;
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, userId)).limit(1);
  if (!supplier) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const {
    description,
    logoUrl,
    coverUrl,
    companyName,
    country,
    warehouseLocation,
    commercialRegNumber,
    certifications,
    yearsInBusiness,
    avgResponseTime,
  } = req.body as {
    description?: string;
    logoUrl?: string;
    coverUrl?: string;
    companyName?: string;
    country?: string;
    warehouseLocation?: string;
    commercialRegNumber?: string;
    certifications?: string[];
    yearsInBusiness?: number;
    avgResponseTime?: string;
  };

  const update: Record<string, any> = {};
  if (description !== undefined) update.description = description;
  if (logoUrl !== undefined) update.logoUrl = logoUrl;
  if (coverUrl !== undefined) update.coverUrl = coverUrl;
  if (companyName !== undefined) update.companyName = companyName;
  if (country !== undefined) update.country = country;
  if (warehouseLocation !== undefined) update.warehouseLocation = warehouseLocation;
  if (commercialRegNumber !== undefined) update.commercialRegNumber = commercialRegNumber;
  if (certifications !== undefined) update.certifications = certifications.filter(Boolean);
  if (yearsInBusiness !== undefined) update.yearsInBusiness = yearsInBusiness;
  if (avgResponseTime !== undefined) update.avgResponseTime = avgResponseTime;

  const [updated] = await db.update(suppliersTable)
    .set({ ...update, updatedAt: new Date() })
    .where(eq(suppliersTable.id, supplier.id))
    .returning();

  const userUpdates: Record<string, any> = {};
  if (companyName !== undefined) userUpdates.companyName = companyName;
  if (country !== undefined) userUpdates.country = country;
  if (Object.keys(userUpdates).length > 0) {
    userUpdates.updatedAt = new Date();
    await db.update(usersTable).set(userUpdates).where(eq(usersTable.id, userId));
  }

  res.json({ success: true, supplier: buildSupplier(updated) });
}));

export default router;
