import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";

const router = Router();

function notificationTargetUrl(n: typeof notificationsTable.$inferSelect, role: string) {
  if (n.relatedType === "rfq" && n.relatedId) {
    return role === "admin" ? "/admin?tab=rfqs" : `/dashboard/rfqs/${n.relatedId}`;
  }
  if (n.relatedType === "order" && n.relatedId) {
    return role === "admin" ? "/admin?tab=orders" : `/dashboard/orders?orderId=${n.relatedId}`;
  }
  if (n.relatedType === "collective_order" && n.relatedId) {
    return role === "admin" ? "/admin?tab=collective" : "/dashboard/collective";
  }
  if (n.relatedType === "message") {
    return "/dashboard/messages";
  }
  return role === "admin" ? "/admin" : "/dashboard";
}

function serializeNotification(n: typeof notificationsTable.$inferSelect, role: string) {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    message: n.message,
    isRead: n.isRead,
    relatedId: n.relatedId,
    relatedType: n.relatedType,
    targetUrl: notificationTargetUrl(n, role),
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  };
}

router.get("/notifications", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { unreadOnly } = req.query as any;

  const conditions: any[] = [eq(notificationsTable.userId, user.id)];
  if (unreadOnly === "true") conditions.push(eq(notificationsTable.isRead, false));

  const notifications = await db.select().from(notificationsTable)
    .where(and(...conditions))
    .orderBy(desc(notificationsTable.createdAt))
    .limit(50);

  res.json(notifications.map(n => serializeNotification(n, user.role)));
}));

router.post("/notifications/read-all", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  await db.update(notificationsTable).set({ isRead: true })
    .where(eq(notificationsTable.userId, user.id));
  res.json({ message: "All notifications marked as read" });
}));

router.post("/notifications/read-related", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const relatedType = typeof req.body?.relatedType === "string" ? req.body.relatedType : "";
  if (!["rfq", "order", "message", "collective_order"].includes(relatedType)) {
    res.status(400).json({ message: "Invalid relatedType" });
    return;
  }

  const updated = await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(
      eq(notificationsTable.userId, user.id),
      eq(notificationsTable.relatedType, relatedType),
      eq(notificationsTable.isRead, false),
    ))
    .returning({ id: notificationsTable.id });

  res.json({ message: "Related notifications marked as read", count: updated.length });
}));

router.post("/notifications/:id/read", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(400).json({ message: "Invalid notification id" });
    return;
  }

  const [notification] = await db.update(notificationsTable)
    .set({ isRead: true })
    .where(and(eq(notificationsTable.id, id), eq(notificationsTable.userId, user.id)))
    .returning();

  if (!notification) {
    res.status(404).json({ message: "Notification not found" });
    return;
  }

  res.json(serializeNotification(notification, user.role));
}));

export default router;
