import React, { useEffect } from "react";
import { Snackbar, Paper, Box, Typography, IconButton, ThemeProvider } from "@mui/material";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";

export type ToastType = "success" | "error";

interface ToastProps {
  message: string;
  type: ToastType;
  onClose: () => void;
  title?: string;
  duration?: number;
}

const DEFAULT_TITLE: Record<ToastType, string> = {
  success: "Success",
  error: "Error",
};

const ACCENT: Record<ToastType, string> = {
  success: "#059669",
  error: "#DC2626",
};
const Toast: React.FC<ToastProps> = ({ message, type, onClose, title, duration = 4000 }) => {
  useEffect(() => {
    if (!duration) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  const accent = ACCENT[type];

  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <Snackbar
        open
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
        sx={{ zIndex: (t) => t.zIndex.snackbar + 100 }}
      >
        <Paper
          role="alert"
          elevation={0}
          sx={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: 320,
            maxWidth: 440,
            p: 2,
            pr: 5,
            borderRadius: 1,
            border: `1.5px solid ${accent}`,
            boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
            overflow: "hidden",
            animation: "app-toast-in 0.2s ease-out",
            "@keyframes app-toast-in": {
              from: { opacity: 0, transform: "translateY(-10px)" },
              to: { opacity: 1, transform: "translateY(0)" },
            },
          }}
        >
          <Box
            sx={{
              flexShrink: 0,
              width: 28,
              height: 28,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "50%",
              border: `1.5px solid ${accent}`,
              bgcolor: "#FFFFFF",
              color: accent,
            }}
          >
            {type === "success" ? <CheckIcon sx={{ fontSize: 16 }} /> : <CloseIcon sx={{ fontSize: 16 }} />}
          </Box>

          <Box sx={{ minWidth: 0 }}>
            <Typography
              sx={{
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: "0.4px",
                textTransform: "uppercase",
                color: "#111827",
                lineHeight: 1.2,
              }}
            >
              {title ?? DEFAULT_TITLE[type]}
            </Typography>
            <Typography sx={{ fontSize: 14, lineHeight: 1.35, color: "#4B5563", mt: 0.25 }}>
              {message}
            </Typography>
          </Box>

          <IconButton
            onClick={onClose}
            aria-label="Close"
            size="small"
            sx={{
              position: "absolute",
              top: 6,
              right: 6,
              color: "#9CA3AF",
              "&:hover": { color: "#4B5563", bgcolor: "rgba(0,0,0,0.04)" },
            }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>

          {duration > 0 && (
            <Box
              sx={{
                position: "absolute",
                left: 0,
                bottom: 0,
                height: 3,
                width: "100%",
                bgcolor: accent,
                transformOrigin: "left",
                animation: `app-toast-shrink ${duration}ms linear forwards`,
                "@keyframes app-toast-shrink": {
                  from: { transform: "scaleX(1)" },
                  to: { transform: "scaleX(0)" },
                },
              }}
            />
          )}
        </Paper>
      </Snackbar>
    </ThemeProvider>
  );
};

export default Toast;