import { Outlet, useLocation } from "react-router-dom";
import { Box, ThemeProvider, CssBaseline } from "@mui/material";
import Sidebar from "./Sidebar";
import Header from "./Header";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";

const DRAWER_WIDTH = 260;
const PAGE_KEYFRAMES = {
  "@keyframes pageFadeUp": {
    from: { opacity: 0, transform: "translateY(16px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

const SuperAdminLayout = () => {
  const location = useLocation();

  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box sx={{ display: "flex", height: "100vh", overflow: "hidden" }}>
        <Sidebar />
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
          <Header />
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
    </ThemeProvider>
  );
};

export default SuperAdminLayout;