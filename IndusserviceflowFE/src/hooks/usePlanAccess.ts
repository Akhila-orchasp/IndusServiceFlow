import { useMemo } from "react";
import useSubscriptionStatus from "./useSubscriptionStatus";
import type { MySubscriptionStatus } from "../types/subscription";
const READ_ONLY_STATUSES: MySubscriptionStatus["subscription_status"][] = [
  "expired",
  "cancelled",
  "pending_payment",
  "pending_activation",
];

export interface LimitCheck {
  unlimited: boolean;
  used: number;
  limit: number | null;
  reached: boolean;
  remaining: number | null;
}

const buildLimitCheck = (used: number | undefined, limit: number | null | undefined): LimitCheck => {
  const safeUsed = used ?? 0;
  const safeLimit = limit ?? null;
  if (safeLimit == null) {
    return { unlimited: true, used: safeUsed, limit: null, reached: false, remaining: null };
  }
  return {
    unlimited: false,
    used: safeUsed,
    limit: safeLimit,
    reached: safeUsed >= safeLimit,
    remaining: Math.max(0, safeLimit - safeUsed),
  };
};
export function usePlanAccess() {
  const { status, loading, refetch } = useSubscriptionStatus();

  const isReadOnly = !!status && READ_ONLY_STATUSES.includes(status.subscription_status);

  const employeeLimit = useMemo(
    () => buildLimitCheck(status?.employee_count, status?.employee_limit),
    [status?.employee_count, status?.employee_limit]
  );

  const queueLimit = useMemo(
    () => buildLimitCheck(status?.queue_count, status?.queue_limit),
    [status?.queue_count, status?.queue_limit]
  );
  const hasFeature = (label: string): boolean => {
    if (!status) return false;
    const feature = status.features?.find((f) => f.label.toLowerCase() === label.toLowerCase());
    return !!feature?.included;
  };
  const canAddEmployee = !isReadOnly && !employeeLimit.reached;
  const canAddQueue = !isReadOnly && !queueLimit.reached;
  const canAddService = canAddQueue;
  const blockedReason = (kind: "employee" | "queue" | "write" = "write"): string | null => {
    if (isReadOnly) {
      if (status?.subscription_status === "cancelled") {
        return "Your subscription was cancelled. Renew your plan to make changes.";
      }
      if (status?.subscription_status === "pending_payment") {
        return "Your new plan is awaiting payment. Changes will unlock once payment is confirmed.";
      }
      if (status?.subscription_status === "pending_activation") {
        return "Your new plan is being activated. Changes will unlock in just a moment — no action needed.";
      }
      return "Your subscription has expired. You can still view your data, but making changes is paused until you renew.";
    }
    if (kind === "employee" && employeeLimit.reached) {
      return `You've reached your plan's limit of ${employeeLimit.limit} employee${employeeLimit.limit === 1 ? "" : "s"}. Upgrade your plan to add more.`;
    }
    if (kind === "queue" && queueLimit.reached) {
      return `You've reached your plan's limit of ${queueLimit.limit} active service${queueLimit.limit === 1 ? "" : "s"}. Upgrade your plan to add more.`;
    }
    return null;
  };

  return {
    status,
    loading,
    refetch,
    isReadOnly,
    employeeLimit,
    queueLimit,
    hasFeature,
    canAddEmployee,
    canAddQueue,
    canAddService,
    blockedReason,
  };
}

export default usePlanAccess;