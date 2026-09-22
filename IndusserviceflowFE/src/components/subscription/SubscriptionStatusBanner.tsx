import React, { useState } from "react";
import { Box, Typography, Button } from "@mui/material";
import { WarningAmber as WarningIcon, ReportProblem as ErrorIcon } from "@mui/icons-material";
import RenewPlanDialog from "./RenewPlanDialog";
import type { MySubscriptionStatus } from "../../types/subscription";

interface SubscriptionStatusBannerProps {
  status: MySubscriptionStatus;
  organizationName: string;
  onRenewed: () => void;
}
const SubscriptionStatusBanner: React.FC<SubscriptionStatusBannerProps> = ({
  status,
  organizationName,
  onRenewed,
}) => {
  const [renewOpen, setRenewOpen] = useState(false);

  if (status.subscription_status !== "expiring_soon" && status.subscription_status !== "expired") {
    return null;
  }

  const isExpired = status.subscription_status === "expired";
  const days = status.days_remaining;

  return (
    <>
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          px: 2.5,
          py: 1.25,
          bgcolor: isExpired ? "error.light" : "warning.light",
          color: isExpired ? "error.dark" : "#7C4A03",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          {isExpired ? <ErrorIcon fontSize="small" /> : <WarningIcon fontSize="small" />}
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {isExpired
              ? `Your Subscription Has Expired — ${
                  days != null ? `${days} day${days === 1 ? "" : "s"} remaining` : "grace period active"
                } in your grace period. Renew your plan to avoid losing access.`
              : "Your subscription expires soon. Renew your plan to continue uninterrupted access."}
          </Typography>
        </Box>
        <Button
          size="small"
          variant="contained"
          color={isExpired ? "error" : "warning"}
          disableElevation
          onClick={() => setRenewOpen(true)}
          sx={{ flexShrink: 0 }}
        >
          Renew Plan
        </Button>
      </Box>

      <RenewPlanDialog
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        organizationName={organizationName}
        onRenewed={onRenewed}
      />
    </>
  );
};

export default SubscriptionStatusBanner;