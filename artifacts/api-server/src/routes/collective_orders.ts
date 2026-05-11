import { Router } from "express";
import { db } from "@workspace/db";
import {
  collectiveOrdersTable, collectiveOrderParticipantsTable,
  collectiveOrderOffersTable, collectiveOrderAllocationsTable,
  productsTable, suppliersTable, usersTable, notificationsTable
} from "@workspace/db";
import { eq, and, sql, desc } from "drizzle-orm";
import { canUserBuy, canUserSell, optionalAuth, requireAuth, requireCanBuy, requireCanSell } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { CreateCollectiveOrderBody, JoinCollectiveOrderBody } from "@workspace/api-zod";
import { z } from "zod/v4";

const router = Router();

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

const collectiveOfferBody = z.object({
  unitPrice: z.coerce.number().positive(),
  currency: z.string().min(1).default("SAR"),
  availableQty: z.coerce.number().positive(),
  leadTime: z.string().min(1),
  incoterms: z.array(z.string()).default([]),
  paymentTerms: z.string().optional(),
  deliveryModel: z.enum(["supplier_delivery_to_each_buyer", "one_delivery_hub", "buyer_pickup", "to_be_agreed"]).default("to_be_agreed"),
  deliveryCostMode: z.enum(["included", "separate_per_buyer", "quoted_after_supplier_offer", "one_hub_delivery"]).default("quoted_after_supplier_offer"),
  validUntil: z.string().optional(),
  notes: z.string().optional(),
});

const recommendOfferBody = z.object({
  offerId: z.coerce.number().int().positive(),
});

const confirmAllocationBody = z.object({
  finalQty: z.coerce.number().positive(),
  deliveryCity: z.string().min(1),
  deliveryAddress: z.string().min(1),
  contactName: z.string().min(1),
  contactPhone: z.string().min(1),
  contactEmail: z.string().email(),
});

async function notifyUser(userId: number | null | undefined, title: string, message: string, collectiveOrderId: number) {
  if (!userId) return;
  await db.insert(notificationsTable).values({
    userId,
    type: "collective_milestone",
    title,
    message,
    relatedId: collectiveOrderId,
    relatedType: "collective_order",
    isRead: false,
  });
}

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
    supplierId: co.supplierId ?? null,
    supplierName: s?.companyName ?? "",
    createdByBuyerId: co.createdByBuyerId ?? null,
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
    collectiveStage: co.collectiveStage ?? "gathering",
    targetPrice: co.targetPrice ? parseFloat(co.targetPrice) : null,
    recommendedOfferId: co.recommendedOfferId ?? null,
    selectedOfferId: co.selectedOfferId ?? null,
    isAllocationLocked: co.isAllocationLocked ?? false,
    isAllocationSharingApproved: co.isAllocationSharingApproved ?? false,
    deadline: co.deadline instanceof Date ? co.deadline.toISOString() : co.deadline,
    deliveryRegion: co.deliveryRegion,
    moqPerParticipant: moqPer,
    estimatedSavingsPerTon: basePrice - currentPrice,
    createdAt: co.createdAt instanceof Date ? co.createdAt.toISOString() : co.createdAt,
  };
}

router.get("/collective-orders", asyncHandler(async (req, res) => {
  const { status, stage, categoryId, region, page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];
  if (status) conditions.push(eq(collectiveOrdersTable.status, status));
  if (stage) conditions.push(eq(collectiveOrdersTable.collectiveStage, stage));
  if (categoryId) conditions.push(eq(productsTable.categoryId, parseInt(categoryId)));
  if (region) conditions.push(eq(collectiveOrdersTable.deliveryRegion, String(region)));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(collectiveOrdersTable)
      .leftJoin(productsTable, eq(productsTable.id, collectiveOrdersTable.productId))
      .leftJoin(suppliersTable, eq(suppliersTable.id, collectiveOrdersTable.supplierId))
      .where(whereClause)
      .orderBy(desc(collectiveOrdersTable.createdAt))
      .limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` })
      .from(collectiveOrdersTable)
      .leftJoin(productsTable, eq(productsTable.id, collectiveOrdersTable.productId))
      .where(whereClause),
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

router.post("/collective-orders", requireAuth, requireCanBuy, asyncHandler(async (req, res) => {
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
  
  if (body.productId) {
    const [product] = await db.select().from(productsTable)
      .where(eq(productsTable.id, body.productId))
      .limit(1);

    if (!product) {
      res.status(400).json({ message: "Selected product does not exist" });
      return;
    }
  }
  
  // Use first pricing tier as base price (fix pricing logic)
  const basePrice = body.pricingTiers[0].pricePerUnit;
  
  const [co] = await db.insert(collectiveOrdersTable).values({
    productName: body.productName,
    productId: body.productId || null,
    supplierId: null,
    createdByBuyerId: user.id,
    targetQuantity: String(body.targetQuantity),
    currentQuantity: "0",
    unit: body.unit,
    basePrice: String(basePrice),
    currentPrice: String(basePrice),
    pricingTiers: body.pricingTiers,
    status: "open",
    collectiveStage: "gathering",
    targetPrice: String(basePrice),
    deadline,
    deliveryRegion: body.deliveryRegion,
    moqPerParticipant: String(body.moqPerParticipant),
    packagingOptions: [],
  }).returning();

  await notifyUser(user.id, "Collective order created", `Your collective order for ${co.productName} is now gathering participants.`, co.id);

  res.status(201).json(buildCollectiveOrder(co, null, null));
}));

router.get("/collective-orders/:id", optionalAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
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

  const offers = await db.select().from(collectiveOrderOffersTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, collectiveOrderOffersTable.supplierId))
    .where(eq(collectiveOrderOffersTable.collectiveOrderId, id))
    .orderBy(desc(collectiveOrderOffersTable.createdAt));

  const allocations = await db.select().from(collectiveOrderAllocationsTable)
    .leftJoin(usersTable, eq(usersTable.id, collectiveOrderAllocationsTable.buyerId))
    .where(eq(collectiveOrderAllocationsTable.collectiveOrderId, id));

  const base = buildCollectiveOrder(row.collective_orders, row.products, row.suppliers);
  const p = row.products;
  const isAdmin = user?.role === "admin";
  const isLeadBuyer = !!user && row.collective_orders.createdByBuyerId === user.id;
  const isParticipant = !!user && participants.some(pp => pp.collective_order_participants.buyerId === user.id);
  const [viewerSupplier] = user && canUserSell(user)
    ? await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1)
    : [null];
  const isSelectedSupplier = !!viewerSupplier && row.collective_orders.supplierId === viewerSupplier.id;
  const canSeeBuyerDetails = isAdmin || isLeadBuyer || isParticipant || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved);
  const canSeeOffers = isAdmin || isLeadBuyer || isParticipant || !!viewerSupplier;

  const productShape = p ? {
    id: p.id,
    name: p.name,
    casNumber: p.casNumber,
    description: p.description,
    categoryId: p.categoryId,
    categoryName: "",
    supplierId: row.collective_orders.supplierId ?? p.supplierId,
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
      buyerId: canSeeBuyerDetails ? pp.collective_order_participants.buyerId : 0,
      companyName: canSeeBuyerDetails ? (pp.users?.companyName ?? "") : "Anonymous buyer",
      quantity: parseFloat(pp.collective_order_participants.quantity),
      deliveryDestination: canSeeBuyerDetails
        ? pp.collective_order_participants.deliveryDestination
        : pp.collective_order_participants.deliveryDestination.split(",")[0]?.trim() || row.collective_orders.deliveryRegion,
      joinedAt: pp.collective_order_participants.joinedAt instanceof Date
        ? pp.collective_order_participants.joinedAt.toISOString()
        : pp.collective_order_participants.joinedAt,
    })),
    deliveryRegionSummary: Array.from(new Set(participants.map(pp =>
      (pp.collective_order_participants.deliveryDestination || row.collective_orders.deliveryRegion).split(",")[0]?.trim()
    ).filter(Boolean))),
    offers: canSeeOffers ? offers.map(o => ({
      id: o.collective_order_offers.id,
      collectiveOrderId: o.collective_order_offers.collectiveOrderId,
      supplierId: o.collective_order_offers.supplierId,
      supplierName: o.suppliers?.companyName ?? "Supplier",
      unitPrice: parseFloat(o.collective_order_offers.unitPrice),
      currency: o.collective_order_offers.currency,
      availableQty: parseFloat(o.collective_order_offers.availableQty),
      leadTime: o.collective_order_offers.leadTime,
      incoterms: o.collective_order_offers.incoterms ?? [],
      paymentTerms: o.collective_order_offers.paymentTerms,
      deliveryModel: o.collective_order_offers.deliveryModel,
      deliveryCostMode: o.collective_order_offers.deliveryCostMode,
      validUntil: o.collective_order_offers.validUntil instanceof Date ? o.collective_order_offers.validUntil.toISOString() : o.collective_order_offers.validUntil,
      notes: o.collective_order_offers.notes,
      createdAt: o.collective_order_offers.createdAt instanceof Date ? o.collective_order_offers.createdAt.toISOString() : o.collective_order_offers.createdAt,
    })) : [],
    allocations: (isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) || isParticipant)
      ? allocations
          .filter(a => isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) || a.collective_order_allocations.buyerId === user?.id)
          .map(a => ({
            id: a.collective_order_allocations.id,
            collectiveOrderId: a.collective_order_allocations.collectiveOrderId,
            buyerId: a.collective_order_allocations.buyerId,
            buyerCompanyName: isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) ? (a.users?.companyName ?? "") : undefined,
            finalQty: parseFloat(a.collective_order_allocations.finalQty),
            unitPriceSnapshot: parseFloat(a.collective_order_allocations.unitPriceSnapshot),
            subtotalSnapshot: parseFloat(a.collective_order_allocations.subtotalSnapshot),
            deliveryCity: a.collective_order_allocations.deliveryCity,
            deliveryAddress: isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) || a.collective_order_allocations.buyerId === user?.id ? a.collective_order_allocations.deliveryAddress : null,
            contactName: isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) || a.collective_order_allocations.buyerId === user?.id ? a.collective_order_allocations.contactName : null,
            contactPhone: isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) || a.collective_order_allocations.buyerId === user?.id ? a.collective_order_allocations.contactPhone : null,
            contactEmail: isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) || a.collective_order_allocations.buyerId === user?.id ? a.collective_order_allocations.contactEmail : null,
            confirmationStatus: a.collective_order_allocations.confirmationStatus,
            invoiceStatus: a.collective_order_allocations.invoiceStatus,
            paymentStatus: a.collective_order_allocations.paymentStatus,
            fulfillmentStatus: a.collective_order_allocations.fulfillmentStatus,
            proformaInvoiceUrl: a.collective_order_allocations.buyerId === user?.id || isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) ? a.collective_order_allocations.proformaInvoiceUrl : null,
            commercialInvoiceUrl: a.collective_order_allocations.buyerId === user?.id || isAdmin || (isSelectedSupplier && row.collective_orders.isAllocationSharingApproved) ? a.collective_order_allocations.commercialInvoiceUrl : null,
          }))
      : [],
    packagingOptions: row.collective_orders.packagingOptions ?? [],
    logisticsSavingsEstimate: parseFloat(row.collective_orders.currentQuantity ?? "0") * 12,
  });
}));

router.post("/collective-orders/:id/join", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  if (!canUserBuy(user)) {
    res.status(403).json({ message: "Buying capability is required for this action." });
    return;
  }
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
      throw httpError("Collective order not found", 404);
    }
    
    // Check if order is still open for joining
    if (co.status !== "open" || !["gathering", "offers_open"].includes(co.collectiveStage)) {
      throw httpError("Cannot join an order that is not open", 400);
    }

    const [ownSupplier] = await tx.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
    if (ownSupplier && co.supplierId && ownSupplier.id === co.supplierId) {
      throw httpError("You cannot join your own collective order as a buyer.", 400);
    }
    
    // Check if deadline has passed
    if (new Date(co.deadline) <= new Date()) {
      throw httpError("Cannot join an order that has expired", 400);
    }
    
    // Check MOQ requirements
    const moqPer = parseFloat(co.moqPerParticipant);
    if (body.quantity < moqPer) {
      throw httpError(`Quantity must be at least ${moqPer} ${co.unit}`, 400);
    }
    
    // Check if user already joined
    const [existingParticipant] = await tx.select().from(collectiveOrderParticipantsTable)
      .where(and(
        eq(collectiveOrderParticipantsTable.collectiveOrderId, id),
        eq(collectiveOrderParticipantsTable.buyerId, user.id)
      )).limit(1);
      
    if (existingParticipant) {
      throw httpError("You have already joined this collective order", 400);
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
    
    return { participant, co, newQty };
  });

  if (result.co.createdByBuyerId && result.co.createdByBuyerId !== user.id) {
    await notifyUser(
      result.co.createdByBuyerId,
      "Buyer joined your collective order",
      `${user.companyName || "A buyer"} joined ${result.co.productName}. Total demand is now ${result.newQty} ${result.co.unit}.`,
      id,
    );
  }

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

router.post("/collective-orders/:id/offers", requireAuth, requireCanSell, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = collectiveOfferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid offer details", errors: parsed.error.issues });
    return;
  }

  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
  if (!supplier) {
    res.status(403).json({ message: "Supplier profile not found" });
    return;
  }

  const [co] = await db.select().from(collectiveOrdersTable).where(eq(collectiveOrdersTable.id, id)).limit(1);
  if (!co) {
    res.status(404).json({ message: "Collective order not found" });
    return;
  }
  if (co.collectiveStage !== "offers_open") {
    res.status(400).json({ message: "This collective order is not open for supplier offers yet." });
    return;
  }
  if (co.createdByBuyerId === user.id) {
    res.status(403).json({ message: "You cannot submit a supplier offer to a collective order your company created as buyer." });
    return;
  }

  const body = parsed.data;
  const values = {
    collectiveOrderId: id,
    supplierId: supplier.id,
    unitPrice: String(body.unitPrice),
    currency: body.currency,
    availableQty: String(body.availableQty),
    leadTime: body.leadTime,
    incoterms: body.incoterms,
    paymentTerms: body.paymentTerms ?? null,
    deliveryModel: body.deliveryModel,
    deliveryCostMode: body.deliveryCostMode,
    validUntil: body.validUntil ? new Date(body.validUntil) : null,
    notes: body.notes ?? null,
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(collectiveOrderOffersTable)
    .where(and(eq(collectiveOrderOffersTable.collectiveOrderId, id), eq(collectiveOrderOffersTable.supplierId, supplier.id)))
    .limit(1);
  const [offer] = existing
    ? await db.update(collectiveOrderOffersTable).set(values).where(eq(collectiveOrderOffersTable.id, existing.id)).returning()
    : await db.insert(collectiveOrderOffersTable).values(values).returning();

  if (co.createdByBuyerId) {
    await notifyUser(co.createdByBuyerId, "Supplier offer submitted", `${supplier.companyName} submitted an offer for ${co.productName}.`, id);
  }

  res.status(existing ? 200 : 201).json({
    id: offer.id,
    collectiveOrderId: offer.collectiveOrderId,
    supplierId: offer.supplierId,
    supplierName: supplier.companyName,
    unitPrice: parseFloat(offer.unitPrice),
    currency: offer.currency,
    availableQty: parseFloat(offer.availableQty),
    leadTime: offer.leadTime,
    incoterms: offer.incoterms ?? [],
    paymentTerms: offer.paymentTerms,
    deliveryModel: offer.deliveryModel,
    deliveryCostMode: offer.deliveryCostMode,
    validUntil: offer.validUntil instanceof Date ? offer.validUntil.toISOString() : offer.validUntil,
    notes: offer.notes,
  });
}));

router.post("/collective-orders/:id/recommend-offer", requireAuth, requireCanBuy, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = recommendOfferBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid offer recommendation", errors: parsed.error.issues });
    return;
  }

  const [co] = await db.select().from(collectiveOrdersTable).where(eq(collectiveOrdersTable.id, id)).limit(1);
  if (!co) {
    res.status(404).json({ message: "Collective order not found" });
    return;
  }
  if (co.createdByBuyerId !== user.id) {
    res.status(403).json({ message: "Only the lead buyer can recommend a supplier offer." });
    return;
  }
  const [offer] = await db.select().from(collectiveOrderOffersTable)
    .where(and(eq(collectiveOrderOffersTable.id, parsed.data.offerId), eq(collectiveOrderOffersTable.collectiveOrderId, id)))
    .limit(1);
  if (!offer) {
    res.status(404).json({ message: "Offer not found" });
    return;
  }

  const [updated] = await db.update(collectiveOrdersTable)
    .set({ recommendedOfferId: offer.id, updatedAt: new Date() })
    .where(eq(collectiveOrdersTable.id, id))
    .returning();

  res.json(updated);
}));

router.post("/collective-orders/:id/confirm-allocation", requireAuth, requireCanBuy, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = confirmAllocationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid allocation details", errors: parsed.error.issues });
    return;
  }

  const [co] = await db.select().from(collectiveOrdersTable).where(eq(collectiveOrdersTable.id, id)).limit(1);
  if (!co) {
    res.status(404).json({ message: "Collective order not found" });
    return;
  }
  if (co.collectiveStage !== "allocations_confirming") {
    res.status(400).json({ message: "Allocations are not open for confirmation yet." });
    return;
  }
  const [participant] = await db.select().from(collectiveOrderParticipantsTable)
    .where(and(eq(collectiveOrderParticipantsTable.collectiveOrderId, id), eq(collectiveOrderParticipantsTable.buyerId, user.id)))
    .limit(1);
  if (!participant) {
    res.status(403).json({ message: "Only participating buyers can confirm allocation." });
    return;
  }
  const [selectedOffer] = co.selectedOfferId
    ? await db.select().from(collectiveOrderOffersTable).where(eq(collectiveOrderOffersTable.id, co.selectedOfferId)).limit(1)
    : [null];
  if (!selectedOffer) {
    res.status(400).json({ message: "No approved supplier offer is selected yet." });
    return;
  }

  const body = parsed.data;
  const subtotal = body.finalQty * parseFloat(selectedOffer.unitPrice);
  const values = {
    collectiveOrderId: id,
    buyerId: user.id,
    finalQty: String(body.finalQty),
    unitPriceSnapshot: selectedOffer.unitPrice,
    subtotalSnapshot: String(subtotal),
    deliveryCity: body.deliveryCity,
    deliveryAddress: body.deliveryAddress,
    contactName: body.contactName,
    contactPhone: body.contactPhone,
    contactEmail: body.contactEmail,
    confirmationStatus: "confirmed" as const,
    confirmedAt: new Date(),
    updatedAt: new Date(),
  };

  const [existing] = await db.select().from(collectiveOrderAllocationsTable)
    .where(and(eq(collectiveOrderAllocationsTable.collectiveOrderId, id), eq(collectiveOrderAllocationsTable.buyerId, user.id)))
    .limit(1);
  const [allocation] = existing
    ? await db.update(collectiveOrderAllocationsTable).set(values).where(eq(collectiveOrderAllocationsTable.id, existing.id)).returning()
    : await db.insert(collectiveOrderAllocationsTable).values(values).returning();

  res.json(allocation);
}));

router.post("/collective-orders/:id/confirm-availability", requireAuth, requireCanSell, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
  if (!supplier) {
    res.status(403).json({ message: "Supplier profile not found" });
    return;
  }
  const [co] = await db.select().from(collectiveOrdersTable).where(eq(collectiveOrdersTable.id, id)).limit(1);
  if (!co) {
    res.status(404).json({ message: "Collective order not found" });
    return;
  }
  if (co.supplierId !== supplier.id || !co.isAllocationSharingApproved) {
    res.status(403).json({ message: "Confirmed allocation is not available to this supplier yet." });
    return;
  }
  const [updated] = await db.update(collectiveOrdersTable)
    .set({ collectiveStage: "supplier_confirmed", updatedAt: new Date() })
    .where(eq(collectiveOrdersTable.id, id))
    .returning();
  if (co.createdByBuyerId) {
    await notifyUser(co.createdByBuyerId, "Supplier confirmed availability", `${supplier.companyName} confirmed availability for ${co.productName}.`, id);
  }
  res.json(updated);
}));

router.post("/collective-orders/:id/leave", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  if (!canUserBuy(user)) {
    res.status(403).json({ message: "Buying capability is required for this action." });
    return;
  }
  
  // Use transaction to prevent data inconsistency
  await db.transaction(async (tx) => {
    // Check if user is actually a participant
    const [participant] = await tx.select().from(collectiveOrderParticipantsTable)
      .where(and(
        eq(collectiveOrderParticipantsTable.collectiveOrderId, id),
        eq(collectiveOrderParticipantsTable.buyerId, user.id)
      )).limit(1);
      
    if (!participant) {
      throw httpError("You are not a participant in this collective order", 400);
    }
    
    // Get current order details
    const [co] = await tx.select().from(collectiveOrdersTable)
      .where(eq(collectiveOrdersTable.id, id)).limit(1);
      
    if (!co) {
      throw httpError("Collective order not found", 404);
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
