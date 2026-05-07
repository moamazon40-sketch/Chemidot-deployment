import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

router.get("/notifications", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { unreadOnly } = req.query as any;

  const conditions: any[] = [eq(notificationsTable.userId, user.id)];
  if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));

  const notifications = await db.select().from(notificationsTable)
    .where(and(...conditions))
    .orderBy(notificationsTable.createdAt)
    .limit(50);

  res.json(notifications.map(n => ({
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    relatedId: n.relatedId,
    relatedType: n.relatedType,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  })));
}));

router.post("/notifications/read-all", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  await db.update(notificationsTable).set({ isRead: true })
    .where(eq(notificationsTable.userId, user.id));
  res.json({ message: "All notifications marked as read" });
}));

export default router;
