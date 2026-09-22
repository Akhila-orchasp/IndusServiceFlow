import { createTheme } from "@mui/material/styles";

export const brandGradient = "linear-gradient(135deg, #0EA5E9 0%, #2563EB 55%, #4F46E5 100%)";
export const brandGradientHover = "linear-gradient(135deg, #0284C7 0%, #1D4ED8 55%, #4338CA 100%)";
export const brandGradientSoft = "linear-gradient(135deg, rgba(14,165,233,0.12) 0%, rgba(79,70,229,0.12) 100%)";

const superAdminMuiTheme = createTheme({
  palette: {
    mode: "light",
    primary: {
      main: "#0EA5E9", // sky-500
      dark: "#0369A1", // sky-700
      light: "#7DD3FC", // sky-300
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: "#4F46E5", // indigo-600 — accent + gradient partner for primary
      dark: "#3730A3", // indigo-800
      light: "#E0E7FF", // indigo-100
      contrastText: "#FFFFFF",
    },
    success: { main: "#059669", light: "#D1FAE5" },
    error: { main: "#DC2626", light: "#FEE2E2" },
    warning: { main: "#D97706", light: "#FEF3C7" },
    info: { main: "#0284C7", light: "#E0F2FE" },
    background: {
      default: "#F0F9FF", // sky-50 tint instead of flat gray
      paper: "#FFFFFF",
    },
    text: {
      primary: "#0B1E33",
      secondary: "#5B7085",
    },
    divider: "#DCEEFB",
  },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    h1: { fontFamily: "'Sora', sans-serif", fontWeight: 700 },
    h2: { fontFamily: "'Sora', sans-serif", fontWeight: 700 },
    h3: { fontFamily: "'Sora', sans-serif", fontWeight: 700 },
    h4: { fontFamily: "'Sora', sans-serif", fontWeight: 700 },
    h5: { fontFamily: "'Sora', sans-serif", fontWeight: 600 },
    h6: { fontFamily: "'Sora', sans-serif", fontWeight: 600 },
    button: { fontFamily: "'Inter', sans-serif", fontWeight: 600, textTransform: "none" },
  },
  shape: {
    borderRadius: 10,
  },
  shadows: [
    "none",
    "0 1px 2px rgba(14,60,97,0.06)",
    "0 2px 10px rgba(14,60,97,0.07)",
    "0 2px 10px rgba(14,60,97,0.07)",
    "0 8px 24px rgba(14,60,97,0.10)",
    "0 8px 24px rgba(14,60,97,0.10)",
    "0 8px 24px rgba(14,60,97,0.10)",
    "0 8px 24px rgba(14,60,97,0.10)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
    "0 18px 44px rgba(14,60,97,0.16)",
  ],
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, paddingInline: 18, paddingBlock: 9 },
      },
      variants: [
        {
          props: { variant: "contained", color: "primary" },
          style: {
            backgroundImage: brandGradient,
            boxShadow: "0 6px 16px rgba(37,99,235,0.28)",
            "&:hover": { backgroundImage: brandGradientHover, boxShadow: "0 8px 20px rgba(37,99,235,0.35)" },
          },
        },
      ],
    },
    MuiTextField: {
      defaultProps: { size: "small" },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: "none" },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid #DCEEFB",
          boxShadow: "0 1px 2px rgba(14,60,97,0.06)",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 600 },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { boxShadow: "none" },
      },
    },
    MuiModal: {
      defaultProps: { disableScrollLock: true },
    },
    MuiPopover: {
      defaultProps: { disableScrollLock: true },
    },
    MuiMenu: {
      defaultProps: { disableScrollLock: true },
    },
    MuiDialog: {
      defaultProps: { disableScrollLock: true },
    },
    MuiDrawer: {
      defaultProps: { ModalProps: { disableScrollLock: true } },
    },
    MuiCssBaseline: {
      styleOverrides: {
        "html, body": {
          scrollbarWidth: "none", // Firefox
          msOverflowStyle: "none", // IE / legacy Edge
        },
        "*": {
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        },
        "*::-webkit-scrollbar": {
          display: "none", // Chrome, Safari, Edge (Chromium)
          width: 0,
          height: 0,
        },
      },
    },
  },
});

export default superAdminMuiTheme;