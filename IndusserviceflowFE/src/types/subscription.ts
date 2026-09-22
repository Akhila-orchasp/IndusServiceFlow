export type BillingCycle = "monthly" | "annual" | "trial";

export interface PlanFeature {
  label: string;
  included: boolean;
}
export interface PublicPlan {
  id: number;
  plan_name: string;
  description: string;
  icon: "magic" | "bolt" | "users" | "building";
  badge: "none" | "free_trial" | "popular";
  monthly_price: number;
  annual_price: number;
  employee_limit: number | null;
  queue_limit: number | null;
  features: PlanFeature[];
  trial_available: boolean;
  trial_days?: number;
}

export type OrganizationStatus = "pending" | "active" | "rejected" | "inactive";
export type SubscriptionStatus =
  | "pending_payment" // Razorpay QR shown, waiting for payment
  | "pending_activation" // payment done (or trial) — waiting for Super Admin
  | "active"
  | "expiring_soon"
  | "expired" // inside the 7-day grace period
  | "locked" // grace period ended, no renewal yet
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed";

export interface RazorpayOrderInfo {
  order_id: string;
  qr_code_url?: string;
  qr_code_id?: string;
  amount: number;
  currency: string;
}

export interface SubscriptionCreationResult {
  message?: string;
  organization: {
    id: number;
    organization_name: string;
    status: OrganizationStatus;
  };
  subscription: {
    id: number;
    status: SubscriptionStatus;
    payment_status: PaymentStatus;
    is_free_trial: boolean;
    plan_name: string;
    billing_cycle: BillingCycle;
    amount: number;
  };
  razorpay?: RazorpayOrderInfo;
}

export interface SubscriptionProgress {
  organization_status: OrganizationStatus;
  subscription_status: SubscriptionStatus;
  payment_status: PaymentStatus;
}
export interface MySubscriptionStatus {
  organization_status: OrganizationStatus;
  subscription_status: SubscriptionStatus;
  payment_status: PaymentStatus;
  plan_name: string;
  billing_cycle: BillingCycle;
  employee_limit: number | null;
  queue_limit: number | null;
  employee_count: number;
  queue_count: number;
  features: PlanFeature[];
  current_period_end?: string | null; // renewal / next payment date
  grace_period_end?: string | null; // when the 7-day grace period ends
  days_remaining?: number | null; // days left in "expiring soon" or grace
}