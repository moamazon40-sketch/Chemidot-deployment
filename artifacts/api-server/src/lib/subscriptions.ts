import { db, adminAuditLogsTable, suppliersTable, type Supplier } from "@workspace/db";
import { eq } from "drizzle-orm";

export const PLAN_DEFAULTS = {
  trial: {
    productLimit: 3,
    rfqAccessEnabled: true,
    rfqLimit: 10,
    featuredSupplier: false,
    billingCycle: "monthly" as const,
  },
  starter: {
    productLimit: 10,
    rfqAccessEnabled: true,
    featuredSupplier: false,
    billingCycle: "monthly" as const,
  },
  growth: {
    productLimit: 50,
    rfqAccessEnabled: true,
    featuredSupplier: true,
    billingCycle: "monthly" as const,
  },
  enterprise: {
    productLimit: null,
    rfqAccessEnabled: true,
    featuredSupplier: true,
    billingCycle: "custom" as const,
  },
} as const;

export type SupplierPlan = keyof typeof PLAN_DEFAULTS;
export type SubscriptionStatus = "trial" | "active" | "past_due" | "suspended" | "cancelled";
export type BillingCycle = "monthly" | "yearly" | "custom";

export function getTrialEndDate(startDate = new Date(), trialDays = 14) {
  const next = new Date(startDate);
  next.setDate(next.getDate() + trialDays);
  return next;
}

export function getPlanDefaults(plan: SupplierPlan) {
  return PLAN_DEFAULTS[plan];
}

export function getStateDrivenVisibility(status: SubscriptionStatus) {
  const hidden = status === "suspended" || status === "cancelled";
  return {
    storefrontVisible: !hidden,
    productsPublic: !hidden,
  };
}

export function deriveSubscriptionPatch(input: {
  current: Supplier;
  supplierPlan?: SupplierPlan;
  subscriptionStatus?: SubscriptionStatus;
  billingCycle?: BillingCycle;
  trialEndsAt?: Date | null;
  gracePeriodEndsAt?: Date | null;
  subscriptionStartedAt?: Date | null;
  subscriptionRenewalDate?: Date | null;
  internalAdminNotes?: string | null;
  featuredSupplier?: boolean;
  storefrontVisible?: boolean;
  productsPublic?: boolean;
  rfqAccessEnabled?: boolean;
  productLimit?: number | null;
  action?: string | null;
}) {
  const currentPlan = (input.supplierPlan ?? input.current.supplierPlan) as SupplierPlan;
  const nextStatus = (input.subscriptionStatus ?? input.current.subscriptionStatus) as SubscriptionStatus;
  const defaults = getPlanDefaults(currentPlan);
  const stateFlags = getStateDrivenVisibility(nextStatus);
  const now = new Date();

  const patch: Record<string, unknown> = {
    supplierPlan: currentPlan,
    subscriptionStatus: nextStatus,
    billingCycle: input.billingCycle ?? input.current.billingCycle ?? defaults.billingCycle,
    trialEndsAt: input.trialEndsAt === undefined ? input.current.trialEndsAt : input.trialEndsAt,
    gracePeriodEndsAt: input.gracePeriodEndsAt === undefined ? input.current.gracePeriodEndsAt : input.gracePeriodEndsAt,
    subscriptionStartedAt: input.subscriptionStartedAt === undefined ? input.current.subscriptionStartedAt : input.subscriptionStartedAt,
    subscriptionRenewalDate: input.subscriptionRenewalDate === undefined ? input.current.subscriptionRenewalDate : input.subscriptionRenewalDate,
    internalAdminNotes: input.internalAdminNotes === undefined ? input.current.internalAdminNotes : input.internalAdminNotes,
    featuredSupplier: input.featuredSupplier ?? input.current.featuredSupplier ?? defaults.featuredSupplier,
    featured: input.featuredSupplier ?? input.current.featuredSupplier ?? input.current.featured ?? defaults.featuredSupplier,
    productLimit: input.productLimit === undefined ? input.current.productLimit ?? defaults.productLimit : input.productLimit,
    rfqAccessEnabled: input.rfqAccessEnabled ?? (nextStatus === "trial" ? defaults.rfqAccessEnabled : nextStatus !== "suspended" && nextStatus !== "cancelled"),
    storefrontVisible: input.storefrontVisible ?? stateFlags.storefrontVisible,
    productsPublic: input.productsPublic ?? stateFlags.productsPublic,
    updatedAt: now,
  };

  if (input.action === "start_trial") {
    patch.subscriptionStatus = "trial";
    patch.subscriptionStartedAt = input.subscriptionStartedAt ?? now;
    patch.trialEndsAt = input.trialEndsAt ?? getTrialEndDate(now);
    patch.gracePeriodEndsAt = input.gracePeriodEndsAt ?? null;
  }

  if (input.action === "activate") {
    patch.subscriptionStatus = "active";
    patch.subscriptionStartedAt = input.subscriptionStartedAt ?? input.current.subscriptionStartedAt ?? now;
  }

  if (input.action === "mark_past_due") {
    patch.subscriptionStatus = "past_due";
  }

  if (input.action === "suspend") {
    patch.subscriptionStatus = "suspended";
    patch.storefrontVisible = false;
    patch.productsPublic = false;
  }

  if (input.action === "reactivate") {
    patch.subscriptionStatus = "active";
    patch.storefrontVisible = true;
    patch.productsPublic = true;
    patch.rfqAccessEnabled = input.rfqAccessEnabled ?? defaults.rfqAccessEnabled ?? true;
  }

  if (input.action === "cancel") {
    patch.subscriptionStatus = "cancelled";
    patch.storefrontVisible = false;
    patch.productsPublic = false;
  }

  return patch;
}

export async function logAdminSupplierAction(params: {
  adminUserId: number;
  supplierId: number;
  action: string;
  details?: Record<string, unknown>;
}) {
  await db.insert(adminAuditLogsTable).values({
    adminUserId: params.adminUserId,
    supplierId: params.supplierId,
    action: params.action,
    detailsJson: params.details ?? {},
  });
}

export async function getSupplierByUserId(userId: number) {
  const [supplier] = await db.select().from(suppliersTable).where(eq(suppliersTable.userId, userId)).limit(1);
  return supplier ?? null;
}

export function isSupplierSuspended(supplier: Supplier | null | undefined) {
  return supplier?.subscriptionStatus === "suspended" || supplier?.subscriptionStatus === "cancelled";
}

export function canSupplierAccessRfqs(supplier: Supplier | null | undefined) {
  if (!supplier) return false;
  if (isSupplierSuspended(supplier)) return false;
  if (supplier.supplierPlan === "trial") return true;
  return supplier.rfqAccessEnabled;
}

export function getSupplierRfqListLimit(supplier: Supplier | null | undefined) {
  if (!supplier) return null;
  return supplier.supplierPlan === "trial" ? PLAN_DEFAULTS.trial.rfqLimit : null;
}

export function hasReachedProductLimit(supplier: Supplier | null | undefined, productCount: number) {
  if (!supplier) return false;
  if (supplier.productLimit === null) return false;
  if (supplier.productLimit === undefined) return false;
  return productCount >= supplier.productLimit;
}
