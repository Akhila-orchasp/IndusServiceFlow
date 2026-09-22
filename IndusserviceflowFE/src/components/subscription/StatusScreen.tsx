import React, { useState } from "react";
import {
  Box,
  Card,
  Typography,
  Chip,
  Button,
  keyframes,
  alpha,
} from "@mui/material";

import {
  HourglassTop as HourglassIcon,
  CheckCircle as CheckCircleIcon,
  AutoAwesome as MagicIcon,
  MarkEmailReadOutlined as EmailIcon,
  ReceiptLong as ReceiptIcon,
} from "@mui/icons-material";

import { downloadPublicSubscriptionReceipt } from "../../services/api";

import type {
  BillingCycle,
  OrganizationStatus,
  PaymentStatus,
  SubscriptionStatus,
} from "../../types/subscription";

interface StatusScreenProps {
  variant: "trial_awaiting" | "paid_awaiting";

  organizationStatus: OrganizationStatus;
  subscriptionStatus: SubscriptionStatus;
  paymentStatus: PaymentStatus;

  onGoToLogin?: () => void;

  organizationName?: string;
  planName?: string;
  billingCycle?: BillingCycle;
  amount?: number;
  subscriptionId?: number | string;
}

const STATUS_CHIP: Record<
  string,
  {
    label: string;
    color: "warning" | "success" | "default";
  }
> = {
  pending: {
    label: "Pending Approval",
    color: "warning",
  },

  active: {
    label: "Active",
    color: "success",
  },

  pending_payment: {
    label: "Pending Payment",
    color: "warning",
  },

  pending_activation: {
    label: "Pending Activation",
    color: "warning",
  },

  paid: {
    label: "Paid",
    color: "success",
  },
};

const pulse = keyframes`
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }

  50% {
    transform: scale(1.08);
    opacity: 0.85;
  }
`;

const popIn = keyframes`
  0% {
    transform: scale(0.6);
    opacity: 0;
  }

  60% {
    transform: scale(1.08);
    opacity: 1;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
`;
const StatusScreen: React.FC<StatusScreenProps> = ({
  variant,
  organizationStatus,
  subscriptionStatus,
  paymentStatus,
  onGoToLogin,
  organizationName,
  planName,
  billingCycle,
  amount,
  subscriptionId,
}) => {
  const isTrial = variant === "trial_awaiting";
  const [downloadingReceipt, setDownloadingReceipt] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  const hasPaymentSummary =
    !isTrial &&
    Boolean(organizationName) &&
    Boolean(planName) &&
    Boolean(billingCycle) &&
    amount !== undefined;
  const canDownloadReceipt =
    hasPaymentSummary && paymentStatus === "paid" && subscriptionId !== undefined;

  const handleDownloadReceipt = async () => {
    if (subscriptionId === undefined) return;
    try {
      setDownloadingReceipt(true);
      setReceiptError(null);
      const blob = await downloadPublicSubscriptionReceipt(subscriptionId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt_SUB-${String(subscriptionId).padStart(5, "0")}.pdf`;
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

  const cycleLabel =
    billingCycle === "monthly"
      ? "Monthly"
      : billingCycle === "annual"
        ? "Annual"
        : billingCycle === "trial"
          ? "Free Trial"
          : "";

  return (
    <Card
      elevation={0}
      sx={{
        width: "100%",
        maxWidth: 500,
        mx: "auto",

        borderRadius: 4,

        overflow: "hidden",

        textAlign: "center",

        backgroundColor: "#ffffff",

        boxShadow:
          "0 20px 60px -20px rgba(15, 23, 42, 0.25)",

        border: "1px solid",
        borderColor: "divider",
      }}
    >
      <Box
        sx={{
          background: isTrial
            ? "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)"
            : "linear-gradient(135deg, #0F766E 0%, #10B981 100%)",

          pt: 4,
          pb: 3.5,

          px: {
            xs: 2.5,
            sm: 3.5,
          },

          position: "relative",
        }}
      >
        {/* Success Icon */}
        <Box
          sx={{
            width: 72,
            height: 72,

            borderRadius: "50%",

            bgcolor: "rgba(255,255,255,0.18)",

            display: "flex",
            alignItems: "center",
            justifyContent: "center",

            mx: "auto",

            mb: 1.5,

            animation: `${popIn} 480ms cubic-bezier(0.34, 1.56, 0.64, 1)`,
          }}
        >
          {isTrial ? (
            <MagicIcon
              sx={{
                fontSize: 36,
                color: "#fff",
              }}
            />
          ) : (
            <CheckCircleIcon
              sx={{
                fontSize: 40,
                color: "#fff",
              }}
            />
          )}
        </Box>

        {/* Payment received / Trial title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 800,
            color: "#fff",
            lineHeight: 1.3,
          }}
        >
          {isTrial ? "You're on the house" : "Payment received"}
        </Typography>

        {/* Payment description */}
        <Typography
          variant="body2"
          sx={{
            color: "rgba(255,255,255,0.88)",
            mt: 0.75,
            lineHeight: 1.5,
          }}
        >
          {isTrial
            ? "Your free trial is all set up."
            : "We've confirmed your payment successfully."}
        </Typography>
      </Box>
      <Box
        sx={{
          px: {
            xs: 2,
            sm: 3.5,
          },
          mt: 0,

          pt: 2.5,

          pb: 3.5,
        }}
      >
        {hasPaymentSummary && (
          <>
            <Box
              sx={{
                width: "100%",

                display: "flex",
                flexDirection: "column",

                gap: 0,

                bgcolor: "#F1F8FC",

                borderRadius: 2.5,

                px: {
                  xs: 2,
                  sm: 2.5,
                },

                py: 1.5,

                mb: 1.75,

                textAlign: "left",

                boxSizing: "border-box",
              }}
            >
              {/* Organization */}
              <SummaryRow
                label="Organization"
                value={organizationName!}
              />

              {/* Plan */}
              <SummaryRow
                label="Plan"
                value={planName!}
              />

              {/* Billing Cycle */}
              <SummaryRow
                label="Billing cycle"
                value={cycleLabel}
              />
            </Box>

            {/* Amount Paid */}
            <Box
              sx={{
                width: "100%",

                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",

                bgcolor: (theme) =>
                  alpha(theme.palette.success.main, 0.08),

                border: "1px solid",

                borderColor: (theme) =>
                  alpha(theme.palette.success.main, 0.24),

                borderRadius: 2.5,

                px: {
                  xs: 2,
                  sm: 2.5,
                },

                py: 1.75,

                mb: 2.5,

                boxSizing: "border-box",
              }}
            >
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                }}
              >
                Amount paid
              </Typography>

              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,

                  fontFamily: "'Sora', sans-serif",

                  color: "success.dark",

                  whiteSpace: "nowrap",
                }}
              >
                ₹{amount!.toLocaleString("en-IN")}
              </Typography>
            </Box>

            {canDownloadReceipt && (
              <>
                <Button
                  fullWidth
                  variant="outlined"
                  color="inherit"
                  startIcon={<ReceiptIcon fontSize="small" />}
                  onClick={handleDownloadReceipt}
                  disabled={downloadingReceipt}
                  sx={{
                    py: 1,
                    mb: receiptError ? 1 : 2.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    textTransform: "none",
                  }}
                >
                  {downloadingReceipt ? "Preparing receipt..." : "Download Receipt"}
                </Button>

                {receiptError && (
                  <Typography
                    color="error"
                    variant="caption"
                    sx={{ display: "block", mb: 2.5, textAlign: "left" }}
                  >
                    {receiptError}
                  </Typography>
                )}
              </>
            )}
          </>
        )}
        <Box
          sx={{
            width: "100%",

            bgcolor: "background.paper",

            borderRadius: 3,

            boxShadow:
              "0 8px 24px -8px rgba(15, 23, 42, 0.18)",

            p: {
              xs: 2,
              sm: 2.5,
            },

            mb: 2.5,

            boxSizing: "border-box",
          }}
        >
          {/* Hourglass */}
          <Box
            sx={{
              width: 52,
              height: 52,

              borderRadius: "50%",

              bgcolor: "rgba(245, 158, 11, 0.12)",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              mx: "auto",

              mb: 1.5,

              animation: `${pulse} 2.2s ease-in-out infinite`,
            }}
          >
            <HourglassIcon
              color="warning"
              sx={{
                fontSize: 26,
              }}
            />
          </Box>

          <Typography
            variant="subtitle1"
            sx={{
              fontWeight: 700,
            }}
          >
            Waiting for Super Admin approval
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              mt: 0.5,
              lineHeight: 1.5,
            }}
          >
            {isTrial
              ? "Your registration is awaiting Super Admin approval."
              : "Your organization is now waiting for Super Admin approval."}
          </Typography>
        </Box>
        <Box
          sx={{
            width: "100%",

            display: "flex",
            flexDirection: "column",

            gap: 0,

            bgcolor: "background.default",

            borderRadius: 2.5,

            px: {
              xs: 2,
              sm: 2.5,
            },

            py: 1.5,

            mb: 2.5,

            textAlign: "left",

            boxSizing: "border-box",
          }}
        >
          <StatusRow
            label="Organization"
            value={organizationStatus}
            fallbackLabel="Pending Approval"
          />

          <StatusRow
            label="Payment"
            value={paymentStatus}
          />

          <StatusRow
            label="Subscription"
            value={subscriptionStatus}
            fallbackLabel="Pending Activation"
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",

            gap: 1,

            mb: 3,

            textAlign: "left",
          }}
        >
          <EmailIcon
            sx={{
              fontSize: 18,

              color: "text.secondary",

              mt: "1px",

              flexShrink: 0,
            }}
          />

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{
              lineHeight: 1.5,
            }}
          >
            You'll be able to sign in as soon as a Super Admin approves
            your organization. You don't need to keep this page open —
            we'll notify you by email.
          </Typography>
        </Box>
        {onGoToLogin && (
          <Button
            fullWidth
            variant="contained"
            onClick={onGoToLogin}
            sx={{
              py: 1.1,

              borderRadius: 2,

              fontWeight: 700,

              textTransform: "none",

              background: isTrial
                ? "linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)"
                : "linear-gradient(135deg, #0F766E 0%, #10B981 100%)",

              boxShadow: "none",

              "&:hover": {
                boxShadow: "none",
                filter: "brightness(0.95)",
              },
            }}
          >
            Back to Sign In
          </Button>
        )}
      </Box>
    </Card>
  );
};

const SummaryRow = ({
  label,
  value,
}: {
  label: string;
  value: string;
}) => {
  return (
    <Box
      sx={{
        minHeight: 38,

        display: "flex",

        alignItems: "center",

        justifyContent: "space-between",

        gap: 2,

        width: "100%",
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{
          flexShrink: 0,
        }}
      >
        {label}
      </Typography>

      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,

          color: "text.primary",

          textAlign: "right",

          minWidth: 0,

          overflow: "hidden",

          textOverflow: "ellipsis",

          whiteSpace: "nowrap",
        }}
      >
        {value}
      </Typography>
    </Box>
  );
};

const StatusRow = ({
  label,
  value,
  fallbackLabel,
}: {
  label: string;
  value: string;
  fallbackLabel?: string;
}) => {
  const meta =
    STATUS_CHIP[value] ?? {
      label: fallbackLabel ?? value,
      color: "default" as const,
    };

  return (
    <Box
      sx={{
        minHeight: 38,

        display: "flex",

        alignItems: "center",

        justifyContent: "space-between",

        gap: 2,
      }}
    >
      <Typography
        variant="body2"
        color="text.secondary"
      >
        {label}
      </Typography>

      <Chip
        size="small"
        label={meta.label}
        color={meta.color}
        sx={{
          fontWeight: 700,

          flexShrink: 0,
        }}
      />
    </Box>
  );
};

export default StatusScreen;