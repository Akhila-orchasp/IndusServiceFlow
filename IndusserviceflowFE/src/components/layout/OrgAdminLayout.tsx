import { Outlet, useLocation } from "react-router-dom";
import { Box, ThemeProvider, CssBaseline } from "@mui/material";
import OrgAdminSidebar from "./OrgAdminSidebar";
import OrgAdminHeader from "./OrgAdminHeader";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";
import useSubscriptionStatus from "../../hooks/useSubscriptionStatus";
import SubscriptionStatusBanner from "../subscription/SubscriptionStatusBanner";
import LockedScreen from "../subscription/LockedScreen";

const DRAWER_WIDTH = 260;
const PAGE_KEYFRAMES = {
  "@keyframes pageFadeUp": {
    from: { opacity: 0, transform: "translateY(16px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

const OrgAdminLayout = () => {
  const { status, refetch } = useSubscriptionStatus();
  const location = useLocation();
  const orgName = localStorage.getItem("org_name") || "Your organization";
  const isLocked = status?.subscription_status === "locked";

  const shell = (
    <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
      <OrgAdminSidebar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          minWidth: 0,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          height: "100vh",
          overflowY: "auto",
          overflowX: "hidden",
          bgcolor: "background.default",
        }}
      >
        <OrgAdminHeader />
        {status && !isLocked && (
          <SubscriptionStatusBanner status={status} organizationName={orgName} onRenewed={refetch} />
        )}
        <Box
          key={location.pathname}
          sx={{
            mt: "72px",
            minWidth: 0,
            ...PAGE_KEYFRAMES,
            animation: "pageFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        >
          <Outlet />
        </Box>
      </Box>
    </Box>
  );

  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      {isLocked ? (
        <LockedScreen organizationName={orgName} onRenewed={refetch}>
          {shell}
        </LockedScreen>
      ) : (
        shell
      )}
    </ThemeProvider>
  );
};

export default OrgAdminLayout;