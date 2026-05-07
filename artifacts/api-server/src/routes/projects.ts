import { Router } from "express";
import { db } from "@workspace/db";
import { projectsTable } from "@workspace/db";
import { eq, desc, and, sql, SQL } from "drizzle-orm";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/projects", asyncHandler(async (req, res) => {
  const rawLimit = req.query.limit;
  const rawFeatured = req.query.featured;
  const rawIndustry = req.query.industry;

  const limitStr = typeof rawLimit === "string" ? rawLimit : "20";
  const parsedLimit = parseInt(limitStr, 10);
  const limitNum = Math.min(50, Math.max(1, isNaN(parsedLimit) ? 20 : parsedLimit));
  const featured = typeof rawFeatured === "string" ? rawFeatured : undefined;
  const industry = typeof rawIndustry === "string" ? rawIndustry : undefined;

  const conditions: SQL[] = [];
  if (featured === "true") {
    conditions.push(eq(projectsTable.featured, true));
  }
  if (industry) {
    const sanitized = industry.toLowerCase().replace(/[%_\\]/g, (ch) => `\\${ch}`);
    conditions.push(
      sql`lower(array_to_string(${projectsTable.industryTags}, ',')) LIKE ${"%" + sanitized + "%"}`
    );
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select()
    .from(projectsTable)
    .where(whereClause)
    .orderBy(desc(projectsTable.createdAt))
    .limit(limitNum);

  res.json(rows.map(p => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    summary: p.summary,
    description: p.description,
    heroImageUrl: p.heroImageUrl,
    industryTags: p.industryTags,
    chemicalsUsed: p.chemicalsUsed,
    supplierId: p.supplierId,
    featured: p.featured,
    createdAt: p.createdAt.toISOString(),
  })));
}));

router.get("/projects/:id", asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  if (isNaN(id)) {
    res.status(400).json({ message: "Invalid id" });
    return;
  }
  const [project] = await db.select().from(projectsTable).where(eq(projectsTable.id, id)).limit(1);
  if (!project) {
    res.status(404).json({ message: "Project not found" });
    return;
  }
  res.json({
    id: project.id,
    title: project.title,
    slug: project.slug,
    summary: project.summary,
    description: project.description,
    heroImageUrl: project.heroImageUrl,
    industryTags: project.industryTags,
    chemicalsUsed: project.chemicalsUsed,
    supplierId: project.supplierId,
    featured: project.featured,
    createdAt: project.createdAt.toISOString(),
  });
}));

export default router;
