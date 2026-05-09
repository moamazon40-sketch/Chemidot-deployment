import { Router } from "express";
import { db } from "@workspace/db";
import {
  supplierBrandsTable,
  supplierDocumentsTable,
  supplierExpertsTable,
  suppliersTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../middlewares/asyncHandler";
import { requireAuth, requireRole } from "../middlewares/auth";
import { insertSupplierBrandSchema, insertSupplierDocumentSchema, insertSupplierExpertSchema } from "@workspace/db";

const router = Router();

async function getPublicSupplierOr404(supplierId: number, res: any) {
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId)).limit(1);
  if (!supplier || !supplier.storefrontVisible) {
    res.status(404).json({ message: "Supplier not found" });
    return null;
  }
  return supplier;
}

async function getCurrentSupplierId(userId: number) {
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, userId)).limit(1);
  return supplier?.id ?? null;
}

router.get("/suppliers/:id/brands", asyncHandler(async (req, res) => {
  const supplierId = parseInt(String(req.params.id), 10);
  if (isNaN(supplierId)) { res.status(400).json({ message: "Invalid supplier id" }); return; }
  const supplier = await getPublicSupplierOr404(supplierId, res);
  if (!supplier) return;
  const brands = await db.select().from(supplierBrandsTable).where(eq(supplierBrandsTable.supplierId, supplierId));
  res.json(brands.map(b => ({
    id: b.id,
    supplierId: b.supplierId,
    name: b.name,
    logoUrl: b.logoUrl,
    description: b.description,
    createdAt: b.createdAt.toISOString(),
  })));
}));

router.get("/suppliers/:id/documents", asyncHandler(async (req, res) => {
  const supplierId = parseInt(String(req.params.id), 10);
  if (isNaN(supplierId)) { res.status(400).json({ message: "Invalid supplier id" }); return; }
  const supplier = await getPublicSupplierOr404(supplierId, res);
  if (!supplier) return;
  const docs = await db.select().from(supplierDocumentsTable).where(eq(supplierDocumentsTable.supplierId, supplierId));
  res.json(docs.map(d => ({
    id: d.id,
    supplierId: d.supplierId,
    title: d.title,
    type: d.type,
    fileUrl: d.fileUrl,
    fileSize: d.fileSize,
    createdAt: d.createdAt.toISOString(),
  })));
}));

router.get("/suppliers/:id/experts", asyncHandler(async (req, res) => {
  const supplierId = parseInt(String(req.params.id), 10);
  if (isNaN(supplierId)) { res.status(400).json({ message: "Invalid supplier id" }); return; }
  const supplier = await getPublicSupplierOr404(supplierId, res);
  if (!supplier) return;
  const experts = await db.select().from(supplierExpertsTable).where(eq(supplierExpertsTable.supplierId, supplierId));
  res.json(experts.map(e => ({
    id: e.id,
    supplierId: e.supplierId,
    name: e.name,
    title: e.title,
    email: e.email,
    avatarUrl: e.avatarUrl,
    createdAt: e.createdAt.toISOString(),
  })));
}));

router.post("/suppliers/profile/brands", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const parsed = insertSupplierBrandSchema.safeParse({ ...req.body, supplierId });
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid brand payload", errors: parsed.error.issues });
    return;
  }

  const [brand] = await db.insert(supplierBrandsTable).values(parsed.data).returning();
  res.status(201).json(brand);
}));

router.patch("/suppliers/profile/brands/:id", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  const brandId = parseInt(String(req.params.id), 10);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const [existing] = await db.select().from(supplierBrandsTable).where(eq(supplierBrandsTable.id, brandId)).limit(1);
  if (!existing || existing.supplierId !== supplierId) {
    res.status(404).json({ message: "Brand not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  for (const key of ["name", "logoUrl", "description"] as const) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(supplierBrandsTable).set(updates).where(eq(supplierBrandsTable.id, brandId)).returning();
  res.json(updated);
}));

router.delete("/suppliers/profile/brands/:id", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  const brandId = parseInt(String(req.params.id), 10);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const [existing] = await db.select().from(supplierBrandsTable).where(eq(supplierBrandsTable.id, brandId)).limit(1);
  if (!existing || existing.supplierId !== supplierId) {
    res.status(404).json({ message: "Brand not found" });
    return;
  }

  await db.delete(supplierBrandsTable).where(eq(supplierBrandsTable.id, brandId));
  res.json({ message: "Brand deleted" });
}));

router.post("/suppliers/profile/documents", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const parsed = insertSupplierDocumentSchema.safeParse({ ...req.body, supplierId });
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid document payload", errors: parsed.error.issues });
    return;
  }

  const [document] = await db.insert(supplierDocumentsTable).values(parsed.data).returning();
  res.status(201).json(document);
}));

router.patch("/suppliers/profile/documents/:id", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  const documentId = parseInt(String(req.params.id), 10);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const [existing] = await db.select().from(supplierDocumentsTable).where(eq(supplierDocumentsTable.id, documentId)).limit(1);
  if (!existing || existing.supplierId !== supplierId) {
    res.status(404).json({ message: "Document not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  for (const key of ["title", "type", "fileUrl", "fileSize"] as const) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(supplierDocumentsTable).set(updates).where(eq(supplierDocumentsTable.id, documentId)).returning();
  res.json(updated);
}));

router.delete("/suppliers/profile/documents/:id", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  const documentId = parseInt(String(req.params.id), 10);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const [existing] = await db.select().from(supplierDocumentsTable).where(eq(supplierDocumentsTable.id, documentId)).limit(1);
  if (!existing || existing.supplierId !== supplierId) {
    res.status(404).json({ message: "Document not found" });
    return;
  }

  await db.delete(supplierDocumentsTable).where(eq(supplierDocumentsTable.id, documentId));
  res.json({ message: "Document deleted" });
}));

router.post("/suppliers/profile/experts", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const parsed = insertSupplierExpertSchema.safeParse({ ...req.body, supplierId });
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid expert payload", errors: parsed.error.issues });
    return;
  }

  const [expert] = await db.insert(supplierExpertsTable).values(parsed.data).returning();
  res.status(201).json(expert);
}));

router.patch("/suppliers/profile/experts/:id", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  const expertId = parseInt(String(req.params.id), 10);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const [existing] = await db.select().from(supplierExpertsTable).where(eq(supplierExpertsTable.id, expertId)).limit(1);
  if (!existing || existing.supplierId !== supplierId) {
    res.status(404).json({ message: "Expert not found" });
    return;
  }

  const updates: Record<string, unknown> = {};
  for (const key of ["name", "title", "email", "avatarUrl"] as const) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }
  const [updated] = await db.update(supplierExpertsTable).set(updates).where(eq(supplierExpertsTable.id, expertId)).returning();
  res.json(updated);
}));

router.delete("/suppliers/profile/experts/:id", requireAuth, requireRole("supplier"), asyncHandler(async (req: any, res) => {
  const supplierId = await getCurrentSupplierId(req.user.id);
  const expertId = parseInt(String(req.params.id), 10);
  if (!supplierId) {
    res.status(404).json({ message: "Supplier profile not found" });
    return;
  }

  const [existing] = await db.select().from(supplierExpertsTable).where(eq(supplierExpertsTable.id, expertId)).limit(1);
  if (!existing || existing.supplierId !== supplierId) {
    res.status(404).json({ message: "Expert not found" });
    return;
  }

  await db.delete(supplierExpertsTable).where(eq(supplierExpertsTable.id, expertId));
  res.json({ message: "Expert deleted" });
}));

export default router;
