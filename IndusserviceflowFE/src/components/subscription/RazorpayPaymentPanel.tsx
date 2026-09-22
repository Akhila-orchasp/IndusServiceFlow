import React, { useEffect, useRef, useState } from "react";
import { Box, Card, Typography, Chip, Button, Divider, CircularProgress } from "@mui/material";
import {
  QrCode2 as QrIcon,
  CheckCircle as CheckCircleIcon,
  Shield as ShieldIcon,
} from "@mui/icons-material";
import type { BillingCycle, PaymentStatus, RazorpayOrderInfo } from "../../types/subscription";

interface RazorpayPaymentPanelProps {
  organizationName: string;
  planName: string;
  billingCycle: BillingCycle;
  amount: number;
  razorpay?: RazorpayOrderInfo;
  pollPaymentStatus: () => Promise<PaymentStatus>;
  onPaid: () => void;
  onCancel?: () => void;
  onSimulatePayment?: () => void;
  pollIntervalMs?: number;
}
const RazorpayPaymentPanel: React.FC<RazorpayPaymentPanelProps> = ({
  organizationName,
  planName,
  billingCycle,
  amount,
  razorpay,
  pollPaymentStatus,
  onPaid,
  onCancel,
  onSimulatePayment,
  pollIntervalMs = 4000,
}) => {
  const [status, setStatus] = useState<PaymentStatus>("pending");
  const paidRef = useRef(false);
  const dummyQrData = encodeURIComponent(
    `upi://pay?pn=${organizationName}&am=${amount}&cu=INR&tn=${planName} (${billingCycle})`,
  );
  const qrImageSrc =
    razorpay?.qr_code_url ??
    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${dummyQrData}`;

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const result = await pollPaymentStatus();
        if (cancelled) return;
        setStatus(result);
        if (result === "paid" && !paidRef.current) {
          paidRef.current = true;
          onPaid();
        }
      } catch (err) {
        console.error("Payment status poll failed:", err);
      }
    };

    tick();
    const interval = setInterval(tick, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const cycleLabel = billingCycle === "monthly" ? "Monthly" : billingCycle === "annual" ? "Annual" : "Free Trial";

  return (
    <Card
      elevation={0}
      variant="outlined"
      sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, maxWidth: 460, mx: "auto" }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
        <ShieldIcon color="primary" fontSize="small" />
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 700 }}>
          Secure payment via Razorpay
        </Typography>
      </Box>
      <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
        Complete your payment
      </Typography>

      <Box sx={{ display: "grid", gap: 0.75, mb: 2.5 }}>
        <Row label="Organization" value={organizationName} />
        <Row label="Plan" value={planName} />
        <Row label="Billing cycle" value={cycleLabel} />
      </Box>

      <Divider sx={{ mb: 2.5 }} />

      <Box sx={{ display: "flex", justifyContent: "center", mb: 2.5 }}>
        <Box
          sx={{
            width: 220,
            height: 220,
            borderRadius: 2,
            border: "1px solid",
            borderColor: "divider",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            bgcolor: "background.default",
            overflow: "hidden",
          }}
        >
          {qrImageSrc ? (
            <Box
              component="img"
              src={qrImageSrc}
              alt="Razorpay payment QR code"
              sx={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <Box sx={{ textAlign: "center", color: "text.disabled", px: 2 }}>
              <QrIcon sx={{ fontSize: 56 }} />
              <Typography variant="caption" sx={{ display: "block" }}>
                QR code will appear here
              </Typography>
            </Box>
          )}
        </Box>
      </Box>

      <Typography variant="body2" color="text.secondary" align="center" sx={{ mb: 2.5 }}>
        Scan the QR code using your preferred UPI app to complete payment.
      </Typography>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          bgcolor: "background.default",
          borderRadius: 2,
          p: 2,
          mb: 2.5,
        }}
      >
        <Typography sx={{ fontWeight: 600 }}>Amount to pay</Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
          ₹{amount.toLocaleString("en-IN")}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 1, mb: 2.5 }}>
        {status === "paid" ? (
          <Chip icon={<CheckCircleIcon />} label="Payment Received" color="success" sx={{ fontWeight: 700 }} />
        ) : status === "failed" ? (
          <Chip label="Payment Failed" color="error" sx={{ fontWeight: 700 }} />
        ) : (
          <Chip
            icon={<CircularProgress size={14} sx={{ color: "inherit" }} />}
            label="Payment Pending"
            color="warning"
            sx={{ fontWeight: 700 }}
          />
        )}
      </Box>

      {onCancel && status === "pending" && (
        <Button fullWidth variant="text" color="inherit" onClick={onCancel} sx={{ mb: onSimulatePayment ? 1 : 0 }}>
          Cancel
        </Button>
      )}

      {onSimulatePayment && status === "pending" && (
        <Button
          fullWidth
          variant="outlined"
          size="small"
          onClick={onSimulatePayment}
          sx={{ borderStyle: "dashed", textTransform: "none", color: "text.secondary", borderColor: "divider" }}
        >
          Simulate payment success (dev only)
        </Button>
      )}
    </Card>
  );
};

const Row = ({ label, value }: { label: string; value: string }) => (
  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
    <Typography variant="body2" sx={{ fontWeight: 600 }}>
      {value}
    </Typography>
  </Box>
);

export default RazorpayPaymentPanel;