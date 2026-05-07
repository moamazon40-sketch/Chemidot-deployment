import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, productsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/categories", asyncHandler(async (_req, res) => {
  const categories = await db.select({
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
  .orderBy(categoriesTable.name);

  res.json(categories);
}));

export default router;
