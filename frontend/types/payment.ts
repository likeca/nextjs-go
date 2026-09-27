export type BillingInterval = "month" | "year";

export interface Plan {
  id: string;
  name: string;
  description: string | null;
  stripePriceId: string;
  stripeProductId: string;
  amount: number;
  currency: string;
  interval: string;
  features: string[];
  isPopular: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  plan: Plan;
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Payment {
  id: string;
  userId: string;
  stripePaymentId: string;
  amount: number;
  currency: string;
  status: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export type SubscriptionStatus =
  | "active"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "past_due"
  | "trialing"
  | "unpaid";

export type PaymentStatus = "succeeded" | "pending" | "failed";

/* ── Mappers: Django JSON (ISO date strings) → typed objects (Date) ────────── */
/* eslint-disable @typescript-eslint/no-explicit-any */
export function mapPlan(raw: any): Plan {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description ?? null,
    stripePriceId: raw.stripePriceId,
    stripeProductId: raw.stripeProductId,
    amount: raw.amount,
    currency: raw.currency,
    interval: raw.interval,
    features: raw.features ?? [],
    isPopular: !!raw.isPopular,
    isActive: !!raw.isActive,
    createdAt: new Date(raw.createdAt ?? 0),
    updatedAt: new Date(raw.updatedAt ?? 0),
  };
}

export function mapSubscription(raw: any): Subscription {
  return {
    id: raw.id,
    userId: raw.userId,
    planId: raw.planId,
    plan: mapPlan(raw.plan),
    stripeSubscriptionId: raw.stripeSubscriptionId,
    stripeCustomerId: raw.stripeCustomerId,
    status: raw.status,
    currentPeriodStart: new Date(raw.currentPeriodStart),
    currentPeriodEnd: new Date(raw.currentPeriodEnd),
    cancelAtPeriodEnd: !!raw.cancelAtPeriodEnd,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt ?? raw.createdAt),
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
