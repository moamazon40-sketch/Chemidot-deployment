import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import { usersTable, suppliersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middlewares/auth";
import { asyncHandler } from "../middlewares/asyncHandler";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { getPlanDefaults, getTrialEndDate } from "../lib/subscriptions";

const router = Router();

router.post("/auth/register", asyncHandler(async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const body = parsed.data;
  const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, body.email)).limit(1);
  if (existing) {
    res.status(409).json({ message: "Email already registered" });
    return;
  }
  const passwordHash = await bcrypt.hash(body.password, 10);
  const [user] = await db.insert(usersTable).values({
    email: body.email,
    passwordHash,
    role: body.role,
    firstName: body.firstName,
    lastName: body.lastName,
    companyName: body.companyName,
    industry: body.industry,
    country: body.country,
    phone: body.phone,
    status: "active",
  }).returning();

  if (body.role === "supplier") {
    const defaults = getPlanDefaults("trial");
    await db.insert(suppliersTable).values({
      userId: user.id,
      companyName: body.companyName,
      country: body.country,
      commercialRegNumber: body.commercialRegNumber,
      warehouseLocation: body.warehouseLocation,
      certifications: [],
      verified: false,
      responseRate: "0",
      avgResponseTime: "24 hours",
      supplierPlan: "trial",
      subscriptionStatus: "trial",
      trialEndsAt: getTrialEndDate(),
      subscriptionStartedAt: new Date(),
      billingCycle: defaults.billingCycle,
      featuredSupplier: false,
      productLimit: defaults.productLimit,
      rfqAccessEnabled: defaults.rfqAccessEnabled,
      storefrontVisible: true,
      productsPublic: true,
    });
  }

  const token = signToken(user.id);
  const { passwordHash: _, ...safeUser } = user;
  res.status(201).json({ token, user: { ...safeUser, avatarUrl: null } });
}));

router.post("/auth/login", asyncHandler(async (req, res) => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid request body" });
    return;
  }
  const { email, password } = parsed.data;
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  if (!user) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Invalid credentials" });
    return;
  }
  const token = signToken(user.id);
  const { passwordHash: _, ...safeUser } = user;
  res.json({ token, user: { ...safeUser, avatarUrl: null } });
}));

router.get("/auth/me", requireAuth, (req, res) => {
  const user = (req as any).user;
  const { passwordHash: _, ...safeUser } = user;
  res.json({ ...safeUser, avatarUrl: null });
});

router.post("/auth/logout", (_req, res) => {
  res.json({ message: "Logged out" });
});

router.put("/auth/profile", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { firstName, lastName, companyName, phone, country, industry } = req.body;

  const updates: any = { updatedAt: new Date() };
  if (firstName !== undefined) updates.firstName = firstName;
  if (lastName !== undefined) updates.lastName = lastName;
  if (companyName !== undefined) updates.companyName = companyName;
  if (phone !== undefined) updates.phone = phone;
  if (country !== undefined) updates.country = country;
  if (industry !== undefined) updates.industry = industry;

  const [updated] = await db.update(usersTable).set(updates).where(eq(usersTable.id, user.id)).returning();
  const { passwordHash: _, ...safeUser } = updated;
  res.json({ ...safeUser, avatarUrl: null });
}));

router.post("/auth/change-password", requireAuth, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    res.status(400).json({ message: "currentPassword and newPassword are required" });
    return;
  }
  if (newPassword.length < 8) {
    res.status(400).json({ message: "New password must be at least 8 characters" });
    return;
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    res.status(401).json({ message: "Current password is incorrect" });
    return;
  }

  const newHash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(usersTable.id, user.id));
  res.json({ message: "Password updated successfully" });
}));

export default router;
