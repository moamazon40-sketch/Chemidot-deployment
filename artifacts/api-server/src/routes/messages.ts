import { Router } from "express";
import { db } from "@workspace/db";
import { conversationsTable, messagesTable, usersTable, suppliersTable } from "@workspace/db";
import { eq, or, desc, and, ne, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { SendMessageBody } from "@workspace/api-zod";

const router = Router();

router.post("/messages/start", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { supplierId, initialMessage } = req.body;

  if (!supplierId) {
    res.status(400).json({ message: "supplierId is required" });
    return;
  }

  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.id, supplierId)).limit(1);
  if (!supplier) {
    res.status(404).json({ message: "Supplier not found" });
    return;
  }

  const buyerId = user.id;
  const supplierUserId = supplier.userId;

  const [existing] = await db.select().from(conversationsTable)
    .where(and(
      eq(conversationsTable.buyerId, buyerId),
      eq(conversationsTable.supplierId, supplierUserId)
    )).limit(1);

  let conversation = existing;

  if (!conversation) {
    const [created] = await db.insert(conversationsTable).values({
      buyerId,
      supplierId: supplierUserId,
      lastMessageAt: new Date(),
    }).returning();
    conversation = created;
  }

  if (initialMessage?.trim()) {
    await db.insert(messagesTable).values({
      conversationId: conversation.id,
      senderId: user.id,
      content: initialMessage.trim(),
      isRead: false,
    });
    await db.update(conversationsTable).set({ lastMessageAt: new Date() })
      .where(eq(conversationsTable.id, conversation.id));
  }

  res.json({ conversationId: conversation.id });
}));

router.get("/messages", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const conversations = await db.select().from(conversationsTable)
    .where(or(
      eq(conversationsTable.buyerId, user.id),
      eq(conversationsTable.supplierId, user.id)
    ))
    .orderBy(desc(conversationsTable.lastMessageAt));

  const result = await Promise.all(conversations.map(async c => {
    const otherUserId = user.id === c.buyerId ? c.supplierId : c.buyerId;
    const [[lastMsg], [otherUser], unreadResult] = await Promise.all([
      db.select().from(messagesTable)
        .where(eq(messagesTable.conversationId, c.id))
        .orderBy(desc(messagesTable.createdAt))
        .limit(1),
      db.select().from(usersTable).where(eq(usersTable.id, otherUserId)).limit(1),
      db.select({ count: sql<number>`cast(count(*) as int)` })
        .from(messagesTable)
        .where(and(
          eq(messagesTable.conversationId, c.id),
          eq(messagesTable.isRead, false),
          ne(messagesTable.senderId, user.id)
        )),
    ]);

    return {
      id: c.id,
      otherPartyId: otherUserId,
      otherPartyName: otherUser?.companyName ?? "",
      otherPartyLogoUrl: null,
      lastMessage: lastMsg?.content ?? null,
      lastMessageAt: lastMsg?.createdAt instanceof Date ? lastMsg.createdAt.toISOString() : null,
      unreadCount: unreadResult[0]?.count ?? 0,
    };
  }));

  res.json(result);
}));

router.get("/messages/:conversationId", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const conversationId = parseInt(String(req.params.conversationId));

  const [conversation] = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);

  if (!conversation) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }

  if (conversation.buyerId !== user.id && conversation.supplierId !== user.id) {
    res.status(403).json({ message: "You do not have access to this conversation" });
    return;
  }

  await db.update(messagesTable)
    .set({ isRead: true })
    .where(and(
      eq(messagesTable.conversationId, conversationId),
      eq(messagesTable.isRead, false),
      ne(messagesTable.senderId, user.id),
    ));

  const messages = await db.select().from(messagesTable)
    .leftJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
    .where(eq(messagesTable.conversationId, conversationId))
    .orderBy(desc(messagesTable.createdAt))
    .limit(100);

  res.json(messages.map(m => ({
    id: m.messages.id,
    conversationId: m.messages.conversationId,
    senderId: m.messages.senderId,
    senderName: m.users?.companyName ?? "",
    content: m.messages.content,
    createdAt: m.messages.createdAt instanceof Date ? m.messages.createdAt.toISOString() : m.messages.createdAt,
    isRead: m.messages.isRead,
  })));
}));

router.post("/messages/:conversationId", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const conversationId = parseInt(String(req.params.conversationId));

  const [conversation] = await db.select().from(conversationsTable)
    .where(eq(conversationsTable.id, conversationId))
    .limit(1);

  if (!conversation) {
    res.status(404).json({ message: "Conversation not found" });
    return;
  }

  if (conversation.buyerId !== user.id && conversation.supplierId !== user.id) {
    res.status(403).json({ message: "You do not have access to this conversation" });
    return;
  }

  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request" });
    return;
  }
  const [message] = await db.insert(messagesTable).values({
    conversationId,
    senderId: user.id,
    content: parsed.data.content,
    isRead: false,
  }).returning();

  await db.update(conversationsTable).set({ lastMessageAt: new Date() })
    .where(eq(conversationsTable.id, conversationId));

  res.status(201).json({
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderName: user.companyName,
    content: message.content,
    createdAt: message.createdAt instanceof Date ? message.createdAt.toISOString() : message.createdAt,
    isRead: message.isRead,
  });
}));

export default router;
