import { Router } from "express";
import { db } from "@workspace/db";
import { rfqsTable, usersTable, quotationsTable, suppliersTable, ordersTable, productsTable, categoriesTable, negotiationMessagesTable } from "@workspace/db";
import { eq, and, sql, desc, inArray, or, ilike } from "drizzle-orm";
import { requireAuth, requireRole } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { CreateRfqBody, UpdateRfqBody, SubmitQuotationBody, SendNegotiationMessageBody } from "@workspace/api-zod";

const router = Router();

function httpError(message: string, statusCode: number) {
  return Object.assign(new Error(message), { statusCode });
}

function buildRfq(r: any, quotationCount: number, buyerCompanyName: string) {
  return {
    id: r.id,
    buyerId: r.buyerId,
    buyerCompanyName,
    productName: r.productName,
    casNumber: r.casNumber,
    quantity: parseFloat(r.quantity),
    unit: r.unit,
    deliveryDestination: r.deliveryDestination,
    deliveryDeadline: r.deliveryDeadline instanceof Date ? r.deliveryDeadline.toISOString() : r.deliveryDeadline,
    status: r.status,
    quotationCount,
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : r.createdAt,
  };
}

router.get("/rfqs", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { status, page = "1", limit = "20" } = req.query as any;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(50, parseInt(limit));
  const offset = (pageNum - 1) * limitNum;

  const conditions: any[] = [];

  if (user.role === "buyer") {
    conditions.push(eq(rfqsTable.buyerId, user.id));
  } else if (user.role === "supplier") {
    const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
    if (supplier) {
      const supplierProducts = await db.select({
        name: productsTable.name,
        casNumber: productsTable.casNumber,
        categoryId: productsTable.categoryId,
      }).from(productsTable).where(eq(productsTable.supplierId, supplier.id));

      if (supplierProducts.length > 0) {
        const matchConditions: any[] = [];

        const categoryIds = [...new Set(supplierProducts.map(p => p.categoryId).filter(Boolean))];
        if (categoryIds.length > 0) {
          matchConditions.push(inArray(rfqsTable.categoryId, categoryIds as number[]));
        }

        // Geography matching - filter by supplier's country
        const supplierCountry = supplier.country;
        if (supplierCountry) {
          matchConditions.push(eq(rfqsTable.deliveryDestination, supplierCountry));
        }

        for (const p of supplierProducts) {
          if (p.name) {
            // Use parameterized query to prevent SQL injection
            const escapedName = p.name.replace(/[%_\\]/g, '\\$&');
            matchConditions.push(ilike(rfqsTable.productName, `%${escapedName}%`));
          }
          if (p.casNumber) {
            matchConditions.push(eq(rfqsTable.casNumber, p.casNumber));
          }
        }

        if (matchConditions.length > 0) {
          // Combine category, geography, and product matching with proper logic
          const categoryConditions = matchConditions.filter(cond => 
            cond.toString().includes('categoryId')
          );
          const geographyConditions = matchConditions.filter(cond => 
            cond.toString().includes('deliveryDestination')
          );
          const productMatchConditions = matchConditions.filter(cond => 
            cond.toString().includes('productName') || cond.toString().includes('casNumber')
          );
          
          // Build proper query: (category AND geography AND (product OR CAS))
          const allConditions: any[] = [];
          
          if (categoryConditions.length > 0) {
            allConditions.push(and(...categoryConditions));
          }
          
          if (geographyConditions.length > 0) {
            allConditions.push(and(...geographyConditions));
          }
          
          if (productMatchConditions.length > 0) {
            allConditions.push(or(...productMatchConditions));
          }
          
          if (allConditions.length > 0) {
            conditions.push(and(...allConditions));
          }
        }
      } else {
        conditions.push(sql`false`);
      }
    } else {
      conditions.push(sql`false`);
    }

    conditions.push(eq(rfqsTable.status, "active"));
  }

  if (status) conditions.push(eq(rfqsTable.status, status));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, countResult] = await Promise.all([
    db.select().from(rfqsTable)
      .leftJoin(usersTable, eq(usersTable.id, rfqsTable.buyerId))
      .where(whereClause)
      .orderBy(desc(rfqsTable.createdAt))
      .limit(limitNum).offset(offset),
    db.select({ count: sql<number>`cast(count(*) as int)` }).from(rfqsTable).where(whereClause),
  ]);

  // Optimize quotation counting with single query
  const rfqIds = rows.map(r => r.rfqs.id);
  const quotCounts: Record<number, number> = {};
  
  if (rfqIds.length > 0) {
    const counts = await db.select({
      rfqId: quotationsTable.rfqId,
      count: sql<number>`cast(count(*) as int)`,
    }).from(quotationsTable).where(inArray(quotationsTable.rfqId, rfqIds)).groupBy(quotationsTable.rfqId);
    
    // Build lookup object for O(1) access
    for (const c of counts) {
      quotCounts[c.rfqId] = c.count;
    }
  }

  const total = countResult[0]?.count ?? 0;
  res.json({
    rfqs: rows.map(r => buildRfq(r.rfqs, quotCounts[r.rfqs.id] ?? 0, r.users?.companyName ?? "")),
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum),
  });
}));

router.post("/rfqs", requireAuth, requireRole("buyer", "admin"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const parsed = CreateRfqBody.safeParse(req.body);
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
  
  const deliveryDeadline = new Date(body.deliveryDeadline);
  if (isNaN(deliveryDeadline.getTime()) || deliveryDeadline <= new Date()) {
    res.status(400).json({ message: "Delivery deadline must be in the future" });
    return;
  }
  
  if (!body.productName || body.productName.trim().length === 0) {
    res.status(400).json({ message: "Product name is required" });
    return;
  }
  
  if (!body.deliveryDestination || body.deliveryDestination.trim().length === 0) {
    res.status(400).json({ message: "Delivery destination is required" });
    return;
  }
  
  const [rfq] = await db.insert(rfqsTable).values({
    buyerId: user.id,
    productName: body.productName.trim(),
    casNumber: body.casNumber?.trim() || null,
    quantity: String(body.quantity),
    unit: body.unit,
    deliveryDestination: body.deliveryDestination.trim(),
    deliveryDeadline,
    description: body.description?.trim() || null,
    specifications: body.specifications?.trim() || null,
    categoryId: body.categoryId || null,
    status: "active",
  }).returning();

  res.status(201).json(buildRfq(rfq, 0, user.companyName));
}));

router.put("/rfqs/:id", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const parsed = UpdateRfqBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const [existing] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ message: "RFQ not found" });
    return;
  }
  if (existing.buyerId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  if (existing.status === "awarded" || existing.status === "closed") {
    res.status(400).json({ message: "Cannot edit an awarded or closed RFQ" });
    return;
  }
  const body = parsed.data;
  const updates: any = { updatedAt: new Date() };
  if (body.productName !== undefined) updates.productName = body.productName;
  if (body.casNumber !== undefined) updates.casNumber = body.casNumber;
  if (body.quantity !== undefined) updates.quantity = String(body.quantity);
  if (body.unit !== undefined) updates.unit = body.unit;
  if (body.deliveryDestination !== undefined) updates.deliveryDestination = body.deliveryDestination;
  if (body.deliveryDeadline !== undefined) updates.deliveryDeadline = new Date(body.deliveryDeadline);
  if (body.description !== undefined) updates.description = body.description;
  if (body.specifications !== undefined) updates.specifications = body.specifications;
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId;

  const [updated] = await db.update(rfqsTable).set(updates).where(eq(rfqsTable.id, id)).returning();
  const quotCount = await db.select({ count: sql<number>`cast(count(*) as int)` }).from(quotationsTable).where(eq(quotationsTable.rfqId, id));
  res.json(buildRfq(updated, quotCount[0]?.count ?? 0, user.companyName));
}));

router.delete("/rfqs/:id", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [existing] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, id)).limit(1);
  if (!existing) {
    res.status(404).json({ message: "RFQ not found" });
    return;
  }
  if (existing.buyerId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  if (existing.status === "awarded") {
    res.status(400).json({ message: "Cannot delete an awarded RFQ" });
    return;
  }
  // Use transaction to prevent orphaned quotation and negotiation records.
  await db.transaction(async (tx) => {
    const quotationRows = await tx.select({ id: quotationsTable.id })
      .from(quotationsTable)
      .where(eq(quotationsTable.rfqId, id));
    const quotationIds = quotationRows.map((row) => row.id);

    if (quotationIds.length > 0) {
      await tx.delete(negotiationMessagesTable)
        .where(inArray(negotiationMessagesTable.quotationId, quotationIds));
    }

    await tx.delete(quotationsTable).where(eq(quotationsTable.rfqId, id));
    await tx.delete(rfqsTable).where(eq(rfqsTable.id, id));
  });
  res.status(204).send();
}));

router.get("/rfqs/:id", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));
  const [row] = await db.select().from(rfqsTable)
    .leftJoin(usersTable, eq(usersTable.id, rfqsTable.buyerId))
    .where(eq(rfqsTable.id, id)).limit(1);

  if (!row) {
    res.status(404).json({ message: "RFQ not found" });
    return;
  }

  if (user.role === "buyer" && row.rfqs.buyerId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const quotations = await db.select().from(quotationsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, quotationsTable.supplierId))
    .where(eq(quotationsTable.rfqId, id));

  const rfqBase = buildRfq(row.rfqs, quotations.length, row.users?.companyName ?? "");
  res.json({
    ...rfqBase,
    description: row.rfqs.description,
    specifications: row.rfqs.specifications,
    quotations: quotations.map(q => ({
      id: q.quotations.id,
      rfqId: q.quotations.rfqId,
      supplierId: q.quotations.supplierId,
      supplierName: q.suppliers?.companyName ?? "",
      supplierVerified: q.suppliers?.verified ?? false,
      pricePerUnit: parseFloat(q.quotations.pricePerUnit),
      currency: q.quotations.currency,
      totalPrice: parseFloat(q.quotations.pricePerUnit) * parseFloat(row.rfqs.quantity),
      deliveryTime: q.quotations.deliveryTime,
      validUntil: q.quotations.validUntil instanceof Date ? q.quotations.validUntil.toISOString() : q.quotations.validUntil,
      notes: q.quotations.notes,
      status: q.quotations.status,
      createdAt: q.quotations.createdAt instanceof Date ? q.quotations.createdAt.toISOString() : q.quotations.createdAt,
    })),
  });
}));

router.get("/rfqs/:id/quotations", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const id = parseInt(String(req.params.id));

  const [rfqOwner] = await db.select({ buyerId: rfqsTable.buyerId }).from(rfqsTable).where(eq(rfqsTable.id, id)).limit(1);
  if (!rfqOwner) {
    res.status(404).json({ message: "RFQ not found" });
    return;
  }
  if (user.role === "buyer" && rfqOwner.buyerId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }
  const quotations = await db.select().from(quotationsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, quotationsTable.supplierId))
    .where(eq(quotationsTable.rfqId, id));

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, id)).limit(1);

  res.json(quotations.map(q => ({
    id: q.quotations.id,
    rfqId: q.quotations.rfqId,
    supplierId: q.quotations.supplierId,
    supplierName: q.suppliers?.companyName ?? "",
    supplierVerified: q.suppliers?.verified ?? false,
    pricePerUnit: parseFloat(q.quotations.pricePerUnit),
    currency: q.quotations.currency,
    totalPrice: parseFloat(q.quotations.pricePerUnit) * (rfq ? parseFloat(rfq.quantity) : 0),
    deliveryTime: q.quotations.deliveryTime,
    validUntil: q.quotations.validUntil instanceof Date ? q.quotations.validUntil.toISOString() : q.quotations.validUntil,
    notes: q.quotations.notes,
    status: q.quotations.status,
    createdAt: q.quotations.createdAt instanceof Date ? q.quotations.createdAt.toISOString() : q.quotations.createdAt,
  })));
}));

router.post("/rfqs/:id/quotations", requireAuth, requireRole("supplier", "admin"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const rfqId = parseInt(String(req.params.id));
  const parsed = SubmitQuotationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body", errors: parsed.error.issues });
    return;
  }
  const body = parsed.data;
  
  // Validate input
  if (body.pricePerUnit <= 0) {
    res.status(400).json({ message: "Price must be greater than 0" });
    return;
  }
  
  const validUntil = new Date(body.validUntil);
  if (isNaN(validUntil.getTime()) || validUntil <= new Date()) {
    res.status(400).json({ message: "Valid until date must be in the future" });
    return;
  }
  
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, user.id)).limit(1);
  if (!supplier) {
    res.status(403).json({ message: "Supplier profile not found" });
    return;
  }
  
  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId)).limit(1);
  if (!rfq) {
    res.status(404).json({ message: "RFQ not found" });
    return;
  }
  
  // Check if RFQ is still active
  if (rfq.status !== "active") {
    res.status(400).json({ message: "RFQ is no longer accepting quotations" });
    return;
  }
  
  // Check if supplier already quoted
  const [existingQuotation] = await db.select().from(quotationsTable)
    .where(and(eq(quotationsTable.rfqId, rfqId), eq(quotationsTable.supplierId, supplier.id)))
    .limit(1);
    
  if (existingQuotation) {
    res.status(400).json({ message: "You have already submitted a quotation for this RFQ" });
    return;
  }

  const [quotation] = await db.insert(quotationsTable).values({
    rfqId,
    supplierId: supplier.id,
    pricePerUnit: String(body.pricePerUnit),
    currency: body.currency,
    deliveryTime: body.deliveryTime,
    validUntil,
    notes: body.notes,
    status: "pending",
  }).returning();

  res.status(201).json({
    id: quotation.id,
    rfqId: quotation.rfqId,
    supplierId: quotation.supplierId,
    supplierName: supplier.companyName,
    supplierVerified: supplier.verified,
    pricePerUnit: parseFloat(quotation.pricePerUnit),
    currency: quotation.currency,
    totalPrice: parseFloat(quotation.pricePerUnit) * parseFloat(rfq.quantity),
    deliveryTime: quotation.deliveryTime,
    validUntil: quotation.validUntil instanceof Date ? quotation.validUntil.toISOString() : quotation.validUntil,
    notes: quotation.notes,
    status: quotation.status,
    createdAt: quotation.createdAt instanceof Date ? quotation.createdAt.toISOString() : quotation.createdAt,
  });
}));

router.post("/rfqs/:id/quotations/:qid/accept", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const rfqId = parseInt(String(req.params.id));
  const qid = parseInt(String(req.params.qid));

  // Use transaction to prevent race conditions
  const result = await db.transaction(async (tx) => {
    // Check RFQ status and ownership
    const [rfq] = await tx.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId)).limit(1);
    if (!rfq || rfq.buyerId !== user.id) {
      throw httpError("Forbidden", 403);
    }

    // Prevent accepting quotations for already awarded/closed RFQs
    if (rfq.status === "awarded" || rfq.status === "closed") {
      throw httpError("RFQ already awarded or closed", 400);
    }

    const [quotation] = await tx.select().from(quotationsTable)
      .leftJoin(suppliersTable, eq(suppliersTable.id, quotationsTable.supplierId))
      .where(and(eq(quotationsTable.id, qid), eq(quotationsTable.rfqId, rfqId))).limit(1);

    if (!quotation) {
      throw httpError("Quotation not found", 404);
    }

    // Check if quotation is still valid
    if (quotation.quotations.validUntil && new Date(quotation.quotations.validUntil) < new Date()) {
      throw httpError("Quotation has expired", 400);
    }

    // Check if quotation is still pending
    if (quotation.quotations.status !== "pending") {
      throw httpError("Quotation no longer available", 400);
    }

    const totalPrice = parseFloat(quotation.quotations.pricePerUnit) * parseFloat(rfq.quantity);

    // Create order
    const [order] = await tx.insert(ordersTable).values({
      buyerId: user.id,
      supplierId: quotation.quotations.supplierId,
      rfqId,
      quotationId: qid,
      productId: null,
      productName: rfq.productName,
      quantity: rfq.quantity,
      unit: rfq.unit,
      totalPrice: String(totalPrice),
      currency: quotation.quotations.currency,
      status: "confirmed",
      deliveryAddress: rfq.deliveryDestination,
    }).returning();

    // Update statuses atomically
    await Promise.all([
      tx.update(quotationsTable).set({ status: "accepted" }).where(eq(quotationsTable.id, qid)),
      tx.update(rfqsTable).set({ status: "awarded", updatedAt: new Date() }).where(eq(rfqsTable.id, rfqId)),
      tx.update(quotationsTable).set({ status: "rejected" }).where(
        and(eq(quotationsTable.rfqId, rfqId), sql`${quotationsTable.id} != ${qid}`)
      ),
    ]);

    return { order, quotation, rfq };
  });

  res.status(201).json({
    id: result.order.id,
    buyerId: result.order.buyerId,
    supplierId: result.order.supplierId,
    supplierName: result.quotation.suppliers?.companyName ?? "",
    productName: result.order.productName ?? "",
    quantity: parseFloat(result.order.quantity),
    unit: result.order.unit,
    totalPrice: parseFloat(result.order.totalPrice),
    currency: result.order.currency,
    status: result.order.status,
    trackingNumber: null,
    estimatedDelivery: null,
    createdAt: result.order.createdAt instanceof Date ? result.order.createdAt.toISOString() : result.order.createdAt,
  });
}));

router.post("/rfqs/:id/quotations/:qid/reject", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const rfqId = parseInt(String(req.params.id));
  const qid = parseInt(String(req.params.qid));

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId)).limit(1);
  if (!rfq || rfq.buyerId !== user.id) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const [quotation] = await db.select().from(quotationsTable)
    .where(and(eq(quotationsTable.id, qid), eq(quotationsTable.rfqId, rfqId))).limit(1);
  if (!quotation) {
    res.status(404).json({ message: "Quotation not found" });
    return;
  }

  await db.update(quotationsTable).set({ status: "rejected", updatedAt: new Date() }).where(eq(quotationsTable.id, qid));
  res.json({ message: "Quotation rejected" });
}));

router.get("/rfqs/:id/quotations/:qid/negotiations", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const rfqId = parseInt(String(req.params.id));
  const qid = parseInt(String(req.params.qid));

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId)).limit(1);
  if (!rfq) {
    res.status(404).json({ message: "RFQ not found" });
    return;
  }

  // Authorization check: user must be buyer (RFQ owner) or supplier (quotation owner)
  const [quotation] = await db.select().from(quotationsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, quotationsTable.supplierId))
    .where(and(eq(quotationsTable.id, qid), eq(quotationsTable.rfqId, rfqId))).limit(1);
  
  if (!quotation) {
    res.status(404).json({ message: "Quotation not found" });
    return;
  }

  const isBuyer = rfq.buyerId === user.id;
  const isSupplier = quotation.quotations.supplierId && quotation.suppliers?.userId === user.id;
  
  if (!isBuyer && !isSupplier) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  const messages = await db.select().from(negotiationMessagesTable)
    .leftJoin(usersTable, eq(usersTable.id, negotiationMessagesTable.senderId))
    .where(eq(negotiationMessagesTable.quotationId, qid))
    .orderBy(negotiationMessagesTable.createdAt);

  res.json(messages.map(m => ({
    id: m.negotiation_messages.id,
    quotationId: m.negotiation_messages.quotationId,
    senderId: m.negotiation_messages.senderId,
    senderName: m.users ? m.users.firstName + ' ' + m.users.lastName : 'Unknown',
    senderRole: m.users ? m.users.role : 'unknown',
    content: m.negotiation_messages.content,
    type: m.negotiation_messages.type,
    proposedPrice: m.negotiation_messages.proposedPrice,
    proposedDeliveryTime: m.negotiation_messages.proposedDeliveryTime,
    createdAt: m.negotiation_messages.createdAt
  })));
}));

router.post("/rfqs/:id/quotations/:qid/negotiations", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const rfqId = parseInt(String(req.params.id));
  const qid = parseInt(String(req.params.qid));
  const parsed = SendNegotiationMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body", errors: parsed.error.issues });
    return;
  }
  
  const body = parsed.data;
  
  // Validate content
  if (!body.content || body.content.trim().length === 0) {
    res.status(400).json({ message: "Message content cannot be empty" });
    return;
  }

  const [rfq] = await db.select().from(rfqsTable).where(eq(rfqsTable.id, rfqId)).limit(1);
  if (!rfq) {
    res.status(404).json({ message: "RFQ not found" });
    return;
  }

  const [quotationRow] = await db.select().from(quotationsTable)
    .leftJoin(suppliersTable, eq(suppliersTable.id, quotationsTable.supplierId))
    .where(and(eq(quotationsTable.id, qid), eq(quotationsTable.rfqId, rfqId))).limit(1);
  if (!quotationRow) {
    res.status(404).json({ message: "Quotation not found" });
    return;
  }

  const quotation = quotationRow.quotations;
  const supplier = quotationRow.suppliers;
  const isBuyer = rfq.buyerId === user.id;
  const isSupplier = supplier?.userId === user.id;

  if (!isBuyer && !isSupplier) {
    res.status(403).json({ message: "Forbidden" });
    return;
  }

  // Check if quotation is still pending
  if (quotation.status !== "pending") {
    res.status(400).json({ message: "Cannot negotiate on accepted or rejected quotation" });
    return;
  }

  // Check if RFQ is still active
  if (rfq.status !== "active") {
    res.status(400).json({ message: "Cannot negotiate on RFQ that is not active" });
    return;
  }

  // Enhanced counter-offer validation
  if (body.type === "counter_offer") {
    if (!body.proposedPrice || body.proposedPrice <= 0) {
      res.status(400).json({ message: "Counter offer price must be greater than 0" });
      return;
    }
    
    // Validate counter-offer logic
    if (body.proposedPrice && quotation.pricePerUnit) {
      const currentPrice = parseFloat(quotation.pricePerUnit);
      const proposedPrice = Number(body.proposedPrice);
      
      // Ensure price is reasonable (within 50% of current price)
      if (proposedPrice > currentPrice * 1.5) {
        res.status(400).json({ message: "Counter offer price cannot exceed 150% of current price" });
        return;
      }
      
      // Ensure price is not too low (within 50% of current price)
      if (proposedPrice < currentPrice * 0.5) {
        res.status(400).json({ message: "Counter offer price cannot be less than 50% of current price" });
        return;
      }
    }
    
    if (body.proposedDeliveryTime) {
      const proposedDate = new Date(body.proposedDeliveryTime);
      if (isNaN(proposedDate.getTime()) || proposedDate <= new Date()) {
        res.status(400).json({ message: "Proposed delivery time must be in the future" });
        return;
      }
    }
  }

  const [msg] = await db.insert(negotiationMessagesTable).values({
    quotationId: qid,
    senderId: user.id,
    senderRole: user.role,
    type: body.type as any,
    content: body.content.trim(),
    proposedPrice: body.proposedPrice ? String(body.proposedPrice) : null,
    proposedDeliveryTime: body.proposedDeliveryTime ?? null,
  }).returning();

  if (body.type === "counter_offer" && body.proposedPrice) {
    await db.update(quotationsTable).set({
      pricePerUnit: String(body.proposedPrice),
      deliveryTime: body.proposedDeliveryTime ?? quotation.deliveryTime,
      updatedAt: new Date(),
    }).where(eq(quotationsTable.id, qid));
  }

  res.status(201).json({
    id: msg.id,
    quotationId: msg.quotationId,
    senderId: msg.senderId,
    senderName: `${user.firstName} ${user.lastName}`,
    senderRole: msg.senderRole,
    type: msg.type,
    content: msg.content,
    proposedPrice: msg.proposedPrice ? parseFloat(msg.proposedPrice) : null,
    proposedDeliveryTime: msg.proposedDeliveryTime,
    createdAt: msg.createdAt instanceof Date ? msg.createdAt.toISOString() : msg.createdAt,
  });
}));

export default router;
