import React, { useState } from "react";
import { Box, Card, Typography, Button } from "@mui/material";
import { Lock as LockIcon, Logout as LogoutIcon } from "@mui/icons-material";
import RenewPlanDialog from "./RenewPlanDialog";
import { logout as logoutApi, clearAuthStorage } from "../../services/api";

interface LockedScreenProps {
  organizationName: string;
  children: React.ReactNode;
  onRenewed: () => void;
}
const LockedScreen: React.FC<LockedScreenProps> = ({ organizationName, children, onRenewed }) => {
  const [renewOpen, setRenewOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch (err) {
      console.error(err);
    } finally {
      clearAuthStorage();
      window.location.href = "/login";
    }
  };

  return (
    <Box sx={{ position: "relative" }}>
      <Box
        aria-hidden
        sx={{
          filter: "blur(4px) grayscale(0.3)",
          opacity: 0.5,
          pointerEvents: "none",
          userSelect: "none",
        }}
      >
        {children}
      </Box>

      <Box
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: (t) => t.zIndex.modal,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "rgba(11,30,51,0.45)",
          px: 2,
        }}
      >
        <Card
          elevation={0}
          sx={{ p: { xs: 3, sm: 4 }, borderRadius: 3, maxWidth: 440, textAlign: "center", boxShadow: "0 24px 60px rgba(0,0,0,0.35)" }}
        >
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              bgcolor: "error.light",
              color: "error.dark",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              mx: "auto",
              mb: 2,
            }}
          >
            <LockIcon />
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700, mb: 1 }}>
            Subscription Locked
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
            Your subscription has expired and your 7-day grace period has ended.
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Renew your plan to restore access to IndusServiceFlow.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Button variant="contained" size="large" onClick={() => setRenewOpen(true)}>
              Renew Plan
            </Button>
            <Button variant="text" color="inherit" startIcon={<LogoutIcon fontSize="small" />} onClick={handleLogout}>
              Logout
            </Button>
          </Box>
        </Card>
      </Box>

      <RenewPlanDialog
        open={renewOpen}
        onClose={() => setRenewOpen(false)}
        organizationName={organizationName}
        onRenewed={onRenewed}
      />
    </Box>
  );
};

export default LockedScreen;