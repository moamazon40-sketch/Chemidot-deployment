import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { CreateProductReviewBody } from "@workspace/api-zod";

const router = Router();

router.get("/products/:id/reviews", asyncHandler(async (req, res) => {
  const productId = parseInt(String(req.params.id));
  const reviews = await db.select().from(reviewsTable)
    .leftJoin(usersTable, eq(usersTable.id, reviewsTable.buyerId))
    .where(eq(reviewsTable.productId, productId))
    .orderBy(reviewsTable.createdAt)
    .limit(20);

  res.json(reviews.map(r => ({
    id: r.reviews.id,
    productId: r.reviews.productId,
    buyerId: r.reviews.buyerId,
    buyerCompanyName: r.users?.companyName ?? "",
    rating: r.reviews.rating,
    comment: r.reviews.comment,
    createdAt: r.reviews.createdAt instanceof Date ? r.reviews.createdAt.toISOString() : r.reviews.createdAt,
  })));
}));

router.post("/products/:id/reviews", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const productId = parseInt(String(req.params.id));
  const parsed = CreateProductReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const [review] = await db.insert(reviewsTable).values({
    productId,
    buyerId: user.id,
    rating: parsed.data.rating,
    comment: parsed.data.comment,
  }).returning();

  res.status(201).json({
    id: review.id,
    productId: review.productId,
    buyerId: review.buyerId,
    buyerCompanyName: user.companyName,
    rating: review.rating,
    comment: review.comment,
    createdAt: review.createdAt instanceof Date ? review.createdAt.toISOString() : review.createdAt,
  });
}));

export default router;
