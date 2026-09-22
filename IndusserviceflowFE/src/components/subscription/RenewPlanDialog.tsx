import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, Box, Typography, IconButton, Stepper, Step, StepLabel, Button } from "@mui/material";
import { Close as CloseIcon, CheckCircle as CheckCircleIcon, ReceiptLong as ReceiptIcon } from "@mui/icons-material";
import PlanPicker from "./PlanPicker";
import BillingCycleStep from "./BillingCycleStep";
import RazorpayPaymentPanel from "./RazorpayPaymentPanel";
import { renewSubscription, getRenewalPaymentStatus, simulateRenewalPayment, downloadSubscriptionReceipt } from "../../services/api";
import type { BillingCycle, PaymentStatus, PublicPlan, SubscriptionCreationResult } from "../../types/subscription";

interface RenewPlanDialogProps {
  open: boolean;
  onClose: () => void;
  organizationName: string;
  onRenewed: () => void;
  title?: string;
  subtitle?: string;
  confirmLabel?: string;
  initialPlan?: PublicPlan | null;
}

type Step = "plan" | "billing" | "payment" | "submitted";

const RenewPlanDialog: React.FC<RenewPlanDialogProps> = ({
  open,
  onClose,
  organizationName,
  onRenewed,
  title = "Renew your plan",
  subtitle = "Choose a plan and billing cycle to restore full access.",
  confirmLabel = "Renew Now",
  initialPlan = null,
}) => {
  const [step, setStep] = useState<Step>(initialPlan ? "billing" : "plan");
  const [selectedPlan, setSelectedPlan] = useState<PublicPlan | null>(initialPlan);
  const [billingCycle, setBillingCycle] = useState<BillingCycle | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<SubscriptionCreationResult | null>(null);
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);
  useEffect(() => {
    if (open) {
      setSelectedPlan(initialPlan);
      setBillingCycle(null);
      setStep(initialPlan ? "billing" : "plan");
    }
  }, [open, initialPlan]);

  const reset = () => {
    setStep(initialPlan ? "billing" : "plan");
    setSelectedPlan(initialPlan);
    setBillingCycle(null);
    setError(null);
    setResult(null);
    setReceiptError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    onClose();
    setTimeout(reset, 200);
  };

  const handleConfirmBilling = async () => {
    if (!selectedPlan || !billingCycle) return;
    try {
      setSubmitting(true);
      setError(null);
      const response = await renewSubscription({ plan_id: selectedPlan.id, billing_cycle: billingCycle });
      const data: SubscriptionCreationResult = response?.data ?? response;
      setResult(data);
      if (data.subscription.is_free_trial || data.subscription.payment_status === "paid") {
        setStep("submitted");
      } else {
        setStep("payment");
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || "Failed to start renewal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const pollPayment = async (): Promise<PaymentStatus> => {
    if (!result) return "pending";
    const response = await getRenewalPaymentStatus(result.subscription.id);
    const data = response?.data ?? response;
    return data.payment_status as PaymentStatus;
  };

  const handleDownloadReceipt = async () => {
    if (!result) return;
    try {
      setDownloadingReceipt(true);
      setReceiptError(null);
      const blob = await downloadSubscriptionReceipt(result.subscription.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt_SUB-${String(result.subscription.id).padStart(5, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error("Receipt download failed:", err);
      setReceiptError(err?.message || "Couldn't download the receipt. Please try again.");
    } finally {
      setDownloadingReceipt(false);
    }
  };

  const stepIndex = step === "plan" ? 0 : step === "billing" ? 1 : step === "payment" ? 2 : 3;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth slotProps={{ paper: { sx: { borderRadius: 3 } } }}>
      <DialogContent sx={{ p: { xs: 2.5, sm: 4 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", mb: 2.5 }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              {title}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          </Box>
          <IconButton onClick={handleClose} disabled={submitting} size="small">
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        <Stepper activeStep={stepIndex} sx={{ mb: 3.5 }} alternativeLabel>
          <Step><StepLabel>Select Plan</StepLabel></Step>
          <Step><StepLabel>Billing Cycle</StepLabel></Step>
          <Step><StepLabel>Payment</StepLabel></Step>
          <Step><StepLabel>Done</StepLabel></Step>
        </Stepper>

        {error && (
          <Typography color="error" variant="body2" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}
        <Box
          sx={{
            minHeight: { xs: 320, sm: 420 },
            display: "flex",
            flexDirection: "column",
            justifyContent: step === "submitted" ? "center" : "flex-start",
          }}
        >
          {step === "plan" && (
            <PlanPicker
              selectedPlanId={selectedPlan?.id}
              onSelect={(plan) => {
                setSelectedPlan(plan);
                setBillingCycle(null);
                setStep("billing");
              }}
            />
          )}

          {step === "billing" && selectedPlan && (
            <BillingCycleStep
              plan={selectedPlan}
              billingCycle={billingCycle}
              onChange={setBillingCycle}
              onBack={() => setStep("plan")}
              onConfirm={handleConfirmBilling}
              loading={submitting}
              confirmLabel={confirmLabel}
            />
          )}

          {step === "payment" && result && (
            <RazorpayPaymentPanel
              organizationName={organizationName}
              planName={result.subscription.plan_name}
              billingCycle={result.subscription.billing_cycle}
              amount={result.subscription.amount}
              razorpay={result.razorpay}
              pollPaymentStatus={pollPayment}
              onPaid={() => setStep("submitted")}
              onSimulatePayment={async () => {
                if (!result) return;
                try {
                  await simulateRenewalPayment(result.subscription.id);
                } catch (err: any) {
                  console.error("simulate-payment failed:", err);
                  setError("Couldn't confirm payment. Please try again.");
                  return;
                }
                try {
                  const statusResponse = await getRenewalPaymentStatus(result.subscription.id);
                  const statusData = statusResponse?.data ?? statusResponse;
                  setResult((prev) =>
                    prev
                      ? {
                          ...prev,
                          subscription: {
                            ...prev.subscription,
                            payment_status: statusData.payment_status ?? "paid",
                            status: statusData.subscription_status ?? prev.subscription.status,
                          },
                        }
                      : prev,
                  );
                } catch (err) {
                  console.error("Couldn't confirm final status after simulate-payment:", err);
                  setResult((prev) =>
                    prev
                      ? { ...prev, subscription: { ...prev.subscription, payment_status: "paid" } }
                      : prev,
                  );
                }

                setStep("submitted");
              }}
            />
          )}

          {step === "submitted" && result && (
            <Box sx={{ textAlign: "center", py: 3 }}>
              <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 0.5 }}>
                {result.subscription.status === "active" ? "Access restored" : "Payment received"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 380, mx: "auto" }}>
                {result.subscription.status === "active"
                  ? "Your renewal is active. You now have full access to IndusServiceFlow."
                  : "We've received your payment and are finishing setup. This usually only takes a moment."}
              </Typography>

              {receiptError && (
                <Typography color="error" variant="caption" sx={{ display: "block", mb: 1.5 }}>
                  {receiptError}
                </Typography>
              )}

              <Box sx={{ display: "flex", gap: 1.5, justifyContent: "center", flexWrap: "wrap" }}>
                <Button
                  variant="outlined"
                  color="inherit"
                  startIcon={<ReceiptIcon fontSize="small" />}
                  onClick={handleDownloadReceipt}
                  disabled={downloadingReceipt}
                  sx={{ borderRadius: 2, textTransform: "none", fontWeight: 600 }}
                >
                  {downloadingReceipt ? "Preparing receipt..." : "Download Receipt"}
                </Button>
                <Box
                  component="button"
                  onClick={() => {
                    onRenewed();
                    handleClose();
                  }}
                  sx={{
                    border: "none",
                    cursor: "pointer",
                    bgcolor: "primary.main",
                    color: "primary.contrastText",
                    px: 3,
                    py: 1.25,
                    borderRadius: 2,
                    fontWeight: 600,
                    fontFamily: "inherit",
                    fontSize: 14,
                  }}
                >
                  Continue
                </Box>
              </Box>
            </Box>
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default RenewPlanDialog;