import { Router } from "express";
import { db } from "@workspace/db";
import { supplierBrandsTable, supplierDocumentsTable, supplierExpertsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/suppliers/:id/brands", asyncHandler(async (req, res) => {
  const supplierId = parseInt(String(req.params.id), 10);
  if (isNaN(supplierId)) { res.status(400).json({ message: "Invalid supplier id" }); return; }
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

export default router;
