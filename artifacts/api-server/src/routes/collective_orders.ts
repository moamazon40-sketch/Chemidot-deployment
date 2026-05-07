import { Router } from "express";
import { db } from "@workspace/db";
import {
  collectiveOrdersTable, collectiveOrderParticipantsTable,
  productsTable, suppliersTable, categoriesTable, usersTable
} from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { CreateCollectiveOrderBody, JoinCollectiveOrderBody } from "@workspace/api-zod";

const router = Router();

function getPricingTiers(tiers: any[], currentQty: number) {
  let currentTier = "Base Price";
  let discount = 0;
  let nextTierQty: number | null = null;
  let nextTierDiscount: number | null = null;

  const sorted = [...(tiers ?? [])].sort((a, b) => a.minQuantity - b.minQuantity);
  for (let i = 0; i < sorted.length; i++) {
    const tier = sorted[i];
    if (currentQty >= tier.minQuantity) {
      currentTier = `Tier ${i + 1}`;
      discount = tier.discountPercent;
    } else if (nextTierQty === null) {
      nextTierQty = tier.minQuantity;
      nextTierDiscount = tier.discountPercent;
    }
  }
  return { currentTier, discount, nextTierQty, nextTierDiscount };
}

function buildCollectiveOrder(co: any, p: any, s: any) {
  const tiers = co.pricingTiers ?? [];
  const currentQty = parseFloat(co.currentQuantity ?? "0");
  const { currentTier, discount, nextTierQty, nextTierDiscount } = getPricingTiers(tiers, currentQty);
  const basePrice = parseFloat(co.basePrice ?? "0");
  const currentPrice = basePrice * (1 - discount / 100);
  const target = parseFloat(co.targetQuantity ?? "0");
  const moqPer = parseFloat(co.moqPerParticipant ?? "0");

  return {
    id: co.id,
    productId: co.productId,
    productName: co.productName || p?.name || "",
    productImageUrl: p?.imageUrl ?? null,
    supplierId: co.supplierId,
    supplierName: s?.companyName ?? "",
    targetQuantity: target,
    currentQuantity: currentQty,
    unit: co.unit,
    participantCount: 0,
    basePrice,
    currentPrice,
    estimatedDiscount: discount,
    currentTier,
    nextTierQuantity: nextTierQty,
    nextTierDiscount,
    status: co.status,
    deadline: co.deadline instanceof Date ? co.deadline.toISOString() : co.deadline,
    deliveryRegion: co.deliveryRegion,
    moqPerParticipant: moqPer,
    estimatedSavingsPerTon: basePrice - currentPrice,
    createdAt: co.createdAt instanceof Date ? co.createdAt.toISOString() : co.createdAt,
  };
}

router.get("/collective-orders", asyncHandler(async (req, res) => {
  const { status, categoryId, region, page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (status) conditions.push(eq(collectiveOrdersTable.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(collectiveOrdersTable)
      .leftJoin(productsTable, eq(productsTable.id, collectiveOrdersTable.productId))
      .leftJoin(suppliersTable, eq(suppliersTable.id, collectiveOrdersTable.supplierId))
      .where(whereClause)
      .orderBy(desc(collectiveOrdersTable.createdAt))
      .limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(collectiveOrdersTable).where(whereClause),
  ]);

  const total = countResult[0]?.count ?? 0;
  res.json({
    collectiveOrders: rows.map(r => buildCollectiveOrder(r.collective_orders, r.products, r.suppliers)),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.post("/collective-orders", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const parsed = CreateCollectiveOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body", errors: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  
  // Validate input
  if (body.targetQuantity <= 0) {
    res.status(400).json({ message: "Target quantity must be greater than 0" });
    return;
  }
  
  if (body.moqPerParticipant <= 0) {
    res.status(400).json({ message: "MOQ per participant must be greater than 0" });
    return;
  }
  
  const deadline = new Date(body.deadline);
  if (isNaN(deadline.getTime()) || deadline <= new Date()) {
    res.status(400).json({ message: "Deadline must be in the future" });
    return;
  }
  
  if (!body.pricingTiers || body.pricingTiers.length === 0) {
    res.status(400).json({ message: "At least one pricing tier is required" });
    return;
  }
  
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
  if (!supplier) {
    res.status(403).json({ message: "Supplier profile not found" });
    return;
  }
  
    // TODO: Add product ownership validation after schema regeneration
    // if (body.productId) {
    //   const [product] = await db.select().from(productsTable)
    //     .where(and(eq(productsTable.id, body.productId), eq(productsTable.supplierId, supplier.id)))
    //     .limit(1);
    //   
    //   if (!product) {
    //     res.status(403).json({ message: "You can only create collective orders for your own products" });
    //     return;
    //   }
    // }
  
  // Use first pricing tier as base price (fix pricing logic)
  const basePrice = body.pricingTiers[0].pricePerUnit;
  
  const [co] = await db.insert(collectiveOrdersTable).values({
    productName: body.productName,
    productId: body.productId || null,
    supplierId: supplier.id,
    targetQuantity: String(body.targetQuantity),
    currentQuantity: "0",
    unit: body.unit,
    basePrice: String(basePrice),
    currentPrice: String(basePrice),
    pricingTiers: body.pricingTiers,
    status: "open",
    deadline,
    deliveryRegion: body.deliveryRegion,
    moqPerParticipant: String(body.moqPerParticipant),
    packagingOptions: [],
  }).returning();

  res.status(201).json(buildCollectiveOrder(co, null, supplier));
}));

router.get("/collective-orders/:id", asyncHandler(async (req, res) => {
  const id = parseInt(String(req.params.id));
  const [row] = await db.select().from(collectiveOrdersTable)
    .leftJoin(productsTable, eq(productsTable.id, collectiveOrdersTable.productId))
    .leftJoin(suppliersTable, eq(suppliersTable.id, collectiveOrdersTable.supplierId))
    .where(eq(collectiveOrdersTable.id, id)).limit(1);

  if (!row) {
    res.status(404).json({ message: "Collective order not found" });
    return;
  }

  const participants = await db.select().from(collectiveOrderParticipantsTable)
    .leftJoin(usersTable, eq(usersTable.id, collectiveOrderParticipantsTable.buyerId))
    .where(eq(collectiveOrderParticipantsTable.collectiveOrderId, id));

  const base = buildCollectiveOrder(row.collective_orders, row.products, row.suppliers);
  const p = row.products;

  const productShape = p ? {
    id: p.id,
    name: p.name,
    casNumber: p.casNumber,
    description: p.description,
    categoryId: p.categoryId,
    categoryName: "",
    supplierId: row.collective_orders.supplierId,
    supplierName: row.suppliers?.companyName ?? "",
    supplierVerified: row.suppliers?.verified ?? false,
    supplierCountry: row.suppliers?.country ?? "",
    imageUrl: p.imageUrl,
    moq: parseFloat(p.moq),
    moqUnit: p.moqUnit,
    basePrice: p.basePrice ? parseFloat(p.basePrice) : null,
    currency: p.currency,
    availability: p.availability,
    deliveryLeadTime: p.deliveryLeadTime,
    collectiveEligible: p.collectiveEligible,
    rating: null,
    reviewCount: 0,
    createdAt: p.createdAt.toISOString(),
  } : null;

  res.json({
    ...base,
    participantCount: participants.length,
    product: productShape,
    pricingTiers: row.collective_orders.pricingTiers ?? [],
    participants: participants.map(pp => ({
      id: pp.collective_order_participants.id,
      collectiveOrderId: id,
      buyerId: pp.collective_order_participants.buyerId,
      companyName: pp.users?.companyName ?? "",
      quantity: parseFloat(pp.collective_order_participants.quantity),
      deliveryDestination: pp.collective_order_participants.deliveryDestination,
      joinedAt: pp.collective_order_participants.joinedAt instanceof Date
        ? pp.collective_order_participants.joinedAt.toISOString()
        : pp.collective_order_participants.joinedAt,
    })),
    packagingOptions: row.collective_orders.packagingOptions ?? [],
    logisticsSavingsEstimate: parseFloat(row.collective_orders.currentQuantity ?? "0") * 12,
  });
}));

router.post("/collective-orders/:id/join", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = JoinCollectiveOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body", errors: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  
  // Validate input
  if (body.quantity <= 0) {
    res.status(400).json({ message: "Quantity must be greater than 0" });
    return;
  }
  
  if (!body.deliveryDestination || body.deliveryDestination.trim().length === 0) {
    res.status(400).json({ message: "Delivery destination is required" });
    return;
  }

  // Use transaction to prevent race conditions
  const result = await db.transaction(async (tx) => {
    const [co] = await tx.select().from(collectiveOrdersTable).where(eq(collectiveOrdersTable.id, id)).limit(1);
    if (!co) {
      throw new Error("Collective order not found");
    }
    
    // Check if order is still open for joining
    if (co.status !== "open") {
      throw new Error("Cannot join an order that is not open");
    }
    
    // Check if deadline has passed
    if (new Date(co.deadline) <= new Date()) {
      throw new Error("Cannot join an order that has expired");
    }
    
    // Check MOQ requirements
    const moqPer = parseFloat(co.moqPerParticipant);
    if (body.quantity < moqPer) {
      throw new Error(`Quantity must be at least ${moqPer} ${co.unit}`);
    }
    
    // Check if user already joined
    const [existingParticipant] = await tx.select().from(collectiveOrderParticipantsTable)
      .where(and(
        eq(collectiveOrderParticipantsTable.collectiveOrderId, id),
        eq(collectiveOrderParticipantsTable.buyerId, user.id)
      )).limit(1);
      
    if (existingParticipant) {
      throw new Error("You have already joined this collective order");
    }
    
    // Add participant
    const [participant] = await tx.insert(collectiveOrderParticipantsTable).values({
      collectiveOrderId: id,
      buyerId: user.id,
      quantity: String(body.quantity),
      deliveryDestination: body.deliveryDestination.trim(),
      paymentTerms: body.paymentTerms,
    }).returning();

    // Update current quantity atomically
    const newQty = parseFloat(co.currentQuantity ?? "0") + body.quantity;
    await tx.update(collectiveOrdersTable).set({
      currentQuantity: String(newQty),
      updatedAt: new Date(),
    }).where(eq(collectiveOrdersTable.id, id));
    
    return { participant, co };
  });

  res.json({
    id: result.participant.id,
    collectiveOrderId: id,
    buyerId: user.id,
    companyName: user.companyName,
    quantity: parseFloat(result.participant.quantity),
    deliveryDestination: result.participant.deliveryDestination,
    joinedAt: result.participant.joinedAt instanceof Date ? result.participant.joinedAt.toISOString() : result.participant.joinedAt,
  });
}));

router.post("/collective-orders/:id/leave", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  
  // Use transaction to prevent data inconsistency
  await db.transaction(async (tx) => {
    // Check if user is actually a participant
    const [participant] = await tx.select().from(collectiveOrderParticipantsTable)
      .where(and(
        eq(collectiveOrderParticipantsTable.collectiveOrderId, id),
        eq(collectiveOrderParticipantsTable.buyerId, user.id)
      )).limit(1);
      
    if (!participant) {
      throw new Error("You are not a participant in this collective order");
    }
    
    // Get current order details
    const [co] = await tx.select().from(collectiveOrdersTable)
      .where(eq(collectiveOrdersTable.id, id)).limit(1);
      
    if (!co) {
      throw new Error("Collective order not found");
    }
    
    // Remove participant
    await tx.delete(collectiveOrderParticipantsTable)
      .where(and(
        eq(collectiveOrderParticipantsTable.collectiveOrderId, id),
        eq(collectiveOrderParticipantsTable.buyerId, user.id)
      ));
    
    // Update current quantity to maintain consistency
    const newQty = parseFloat(co.currentQuantity ?? "0") - parseFloat(participant.quantity);
    await tx.update(collectiveOrdersTable).set({
      currentQuantity: String(Math.max(0, newQty)),
      updatedAt: new Date(),
    }).where(eq(collectiveOrdersTable.id, id));
  });
  
  res.json({ message: "Left collective order successfully" });
}));

export default router;
