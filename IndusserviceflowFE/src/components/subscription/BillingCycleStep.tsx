import React, { useEffect } from "react";
import { Box, Card, Typography, Button, Chip, alpha } from "@mui/material";
import { CheckCircle as CheckCircleIcon, AutoAwesome as MagicIcon } from "@mui/icons-material";
import type { BillingCycle, PublicPlan } from "../../types/subscription";

interface BillingCycleStepProps {
  plan: PublicPlan;
  billingCycle: BillingCycle | null;
  onChange: (cycle: BillingCycle) => void;
  onBack?: () => void;
  onConfirm: () => void;
  loading?: boolean;
  confirmLabel?: string;
}
// Defensive coercion: Number(...) is a no-op on an actual number and
// protects against a decimal ever arriving as a string ("0.00") from the
// API, which previously made every `=== 0` / arithmetic check below
// silently fail (see COERCE_DECIMAL_TO_STRING in backend settings for the
// underlying fix).
const priceFor = (plan: PublicPlan, cycle: BillingCycle) => {
  if (cycle === "trial") return 0;
  return cycle === "monthly" ? Number(plan.monthly_price) : Number(plan.annual_price);
};

const BillingCycleStep: React.FC<BillingCycleStepProps> = ({
  plan,
  billingCycle,
  onChange,
  onBack,
  onConfirm,
  loading = false,
  confirmLabel = "Continue",
}) => {
  const monthlyPrice = Number(plan.monthly_price);
  const annualPrice = Number(plan.annual_price);
  const isFullyFreePlan = monthlyPrice === 0 && annualPrice === 0;
  // Explicit user acknowledgement for the free-plan path. Previously the
  // "Complete Registration" button here was gated only on `loading`, so a
  // free plan could be registered with zero explicit confirmation beyond
  // the single click that selected the plan card on the previous screen —
  // it could read as "registered without choosing anything." Requiring
  // this checkbox makes the confirmation step actually require an action
  // on THIS screen, consistent with the paid-plan flow below (which is
  // gated on `billingCycle` being chosen).
  const [freePlanAcknowledged, setFreePlanAcknowledged] = React.useState(false);

  useEffect(() => {
    if (isFullyFreePlan && billingCycle !== "monthly") {
      onChange("monthly");
    }
  }, [isFullyFreePlan, plan.id]);

  // Reset the acknowledgement if the user goes back and picks a different
  // (still free) plan, so it can't carry over from a previous plan.
  useEffect(() => {
    setFreePlanAcknowledged(false);
  }, [plan.id]);

  if (isFullyFreePlan) {
    return (
      <Box>
        <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
          Confirm your plan
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          The <strong>{plan.plan_name}</strong> plan is free — no billing cycle to choose.
        </Typography>

        <Card
          variant="outlined"
          onClick={() => setFreePlanAcknowledged((prev) => !prev)}
          sx={{
            p: 2.5,
            borderRadius: 2,
            mb: 3,
            bgcolor: "background.default",
            cursor: "pointer",
            borderColor: freePlanAcknowledged ? "primary.main" : "divider",
            borderWidth: freePlanAcknowledged ? 2 : 1,
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
            Order summary
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 0.75 }}>
                <MagicIcon sx={{ fontSize: 16 }} color="secondary" />
                {plan.plan_name}
              </Typography>
              <Chip size="small" label="Free" sx={{ mt: 0.5, fontWeight: 600 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
              Free
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 2 }}>
            {freePlanAcknowledged ? (
              <CheckCircleIcon color="primary" fontSize="small" />
            ) : (
              <Box sx={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid", borderColor: "divider" }} />
            )}
            <Typography variant="body2">
              I want to register my organization on the <strong>{plan.plan_name}</strong> plan.
            </Typography>
          </Box>
        </Card>

        <Box sx={{ display: "flex", gap: 1.5 }}>
          {onBack && (
            <Button variant="outlined" color="inherit" onClick={onBack} disabled={loading}>
              Back
            </Button>
          )}
          <Button
            fullWidth
            variant="contained"
            size="large"
            disabled={loading || !freePlanAcknowledged}
            onClick={onConfirm}
          >
            {loading ? "Please wait..." : "Complete Registration"}
          </Button>
        </Box>
      </Box>
    );
  }

  const options: { value: BillingCycle; label: string; caption?: string }[] = (() => {
    // Annual is now always priced at exactly monthly x 12 (see
    // Plan.annual_total on the backend) — there is no more independent
    // annual discount. A "Save X%" badge computed from that would always
    // read "Save 0%", which is confusing rather than reassuring, so it's
    // only shown when the plan genuinely prices annual below monthly x 12.
    const savingsPercent =
      monthlyPrice > 0
        ? Math.max(0, Math.round((1 - annualPrice / (monthlyPrice * 12)) * 100))
        : 0;

    return [
      { value: "monthly" as BillingCycle, label: "Monthly" },
      {
        value: "annual" as BillingCycle,
        label: "Annual",
        caption: savingsPercent > 0 ? `Save ${savingsPercent}%` : undefined,
      },
    ];
  })();
  if (plan.trial_available) {
    options.push({ value: "trial", label: `Free Trial (${plan.trial_days ?? 14} days)` });
  }

  const price = billingCycle ? priceFor(plan, billingCycle) : null;

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
        Select billing cycle
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Choose how you'd like to be billed for the <strong>{plan.plan_name}</strong> plan.
      </Typography>

      <Box sx={{ display: "grid", gap: 1.5, mb: 3 }}>
        {options.map((opt) => {
          const selected = billingCycle === opt.value;
          const optPrice = priceFor(plan, opt.value);
          return (
            <Card
              key={opt.value}
              variant="outlined"
              onClick={() => onChange(opt.value)}
              sx={{
                p: 2,
                borderRadius: 2,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                cursor: "pointer",
                borderColor: selected ? "primary.main" : "divider",
                borderWidth: selected ? 2 : 1,
                bgcolor: selected ? (t) => alpha(t.palette.primary.main, 0.05) : "background.paper",
                transition: "all 120ms ease",
              }}
            >
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                {selected ? (
                  <CheckCircleIcon color="primary" fontSize="small" />
                ) : (
                  <Box sx={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid", borderColor: "divider" }} />
                )}
                <Box>
                  <Typography sx={{ fontWeight: 600, display: "flex", alignItems: "center", gap: 0.75 }}>
                    {opt.value === "trial" && <MagicIcon sx={{ fontSize: 16 }} color="secondary" />}
                    {opt.label}
                  </Typography>
                  {opt.caption && (
                    <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                      {opt.caption}
                    </Typography>
                  )}
                </Box>
              </Box>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontWeight: 700 }}>
                  {optPrice === 0 ? "Free" : `₹${optPrice.toLocaleString("en-IN")}`}
                </Typography>
                {opt.value === "annual" && annualPrice > 0 && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                    ≈ ₹{Math.round(annualPrice / 12).toLocaleString("en-IN")}/mo, billed yearly
                  </Typography>
                )}
              </Box>
            </Card>
          );
        })}
      </Box>

      {billingCycle && (
        <Card
          variant="outlined"
          sx={{ p: 2.5, borderRadius: 2, mb: 3, bgcolor: "background.default" }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 700 }}>
            Order summary
          </Typography>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 1 }}>
            <Box>
              <Typography sx={{ fontWeight: 700 }}>{plan.plan_name}</Typography>
              <Chip
                size="small"
                label={billingCycle === "trial" ? "Free Trial" : billingCycle === "monthly" ? "Monthly" : "Annual"}
                sx={{ mt: 0.5, fontWeight: 600 }}
              />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
              {price === 0 ? "Free" : `₹${price?.toLocaleString("en-IN")}`}
            </Typography>
          </Box>
        </Card>
      )}

      <Box sx={{ display: "flex", gap: 1.5 }}>
        {onBack && (
          <Button variant="outlined" color="inherit" onClick={onBack} disabled={loading}>
            Back
          </Button>
        )}
        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={!billingCycle || loading}
          onClick={onConfirm}
        >
          {loading ? "Please wait..." : confirmLabel}
        </Button>
      </Box>
    </Box>
  );
};

export default BillingCycleStep;