import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Dialog,
  Box,
  Typography,
  Button,
  ThemeProvider,
} from "@mui/material";
import WarningRoundedIcon from "@mui/icons-material/WarningRounded";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";

export type ConfirmVariant = "danger" | "default";

export interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmVariant;
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

interface PendingRequest extends Required<Pick<ConfirmOptions, "message">> {
  title: string;
  confirmText: string;
  cancelText: string;
  variant: ConfirmVariant;
  resolve: (value: boolean) => void;
}

const DEFAULTS = {
  title: "Are you sure?",
  confirmText: "Confirm",
  cancelText: "Cancel",
  variant: "default" as ConfirmVariant,
};

export const ConfirmProvider = ({ children }: { children: ReactNode }) => {
  const [request, setRequest] = useState<PendingRequest | null>(null);
  const [open, setOpen] = useState(false);
  const settledRef = useRef(false);

  const confirm = useCallback<ConfirmFn>((options) => {
    return new Promise<boolean>((resolve) => {
      settledRef.current = false;
      setRequest({
        title: options.title ?? DEFAULTS.title,
        message: options.message,
        confirmText: options.confirmText ?? DEFAULTS.confirmText,
        cancelText: options.cancelText ?? DEFAULTS.cancelText,
        variant: options.variant ?? DEFAULTS.variant,
        resolve,
      });
      setOpen(true);
    });
  }, []);

  const settle = useCallback(
    (value: boolean) => {
      if (settledRef.current || !request) return;
      settledRef.current = true;
      setOpen(false);
      const resolve = request.resolve;
      window.setTimeout(() => {
        setRequest(null);
        resolve(value);
      }, 150);
    },
    [request]
  );

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && (
        <ThemeProvider theme={superAdminMuiTheme}>
          <ConfirmDialog
            open={open}
            title={request.title}
            message={request.message}
            confirmText={request.confirmText}
            cancelText={request.cancelText}
            variant={request.variant}
            onConfirm={() => settle(true)}
            onCancel={() => settle(false)}
          />
        </ThemeProvider>
      )}
    </ConfirmContext.Provider>
  );
};

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm() must be used inside <ConfirmProvider>. Wrap your App with it.");
  }
  return ctx;
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: ReactNode;
  confirmText: string;
  cancelText: string;
  variant: ConfirmVariant;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmText,
  cancelText,
  variant,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const icon = useMemo(() => {
    if (variant === "danger") return <DeleteRoundedIcon sx={{ fontSize: 24 }} />;
    return <HelpRoundedIcon sx={{ fontSize: 24 }} />;
  }, [variant]);

  return (
    <Dialog
      open={open}
      onClose={onCancel}
      maxWidth="xs"
      fullWidth
      aria-labelledby="cf-title"
      aria-describedby="cf-message"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 4,
            p: 1,
            textAlign: "center",
            boxShadow: "0 20px 50px rgba(0,0,0,0.25)",
          },
        },
      }}
    >
      <Box sx={{ px: 3, pt: 3, pb: 2.5 }}>
        <Box
          sx={{
            width: 56,
            height: 56,
            mx: "auto",
            mb: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            bgcolor: variant === "danger" ? "#FEE2E2" : "#EEF2FF",
            color: variant === "danger" ? "#DC2626" : "#4F46E5",
          }}
        >
          {variant === "danger" ? <WarningRoundedIcon sx={{ fontSize: 26 }} /> : icon}
        </Box>

        <Typography id="cf-title" variant="h6" sx={{ fontWeight: 700, color: "#111827", mb: 1 }}>
          {title}
        </Typography>
        <Typography id="cf-message" sx={{ fontSize: 14, lineHeight: 1.5, color: "#6B7280" }}>
          {message}
        </Typography>

        <Box sx={{ display: "flex", gap: 1.5, mt: 3 }}>
          <Button
            fullWidth
            variant="outlined"
            color="inherit"
            onClick={onCancel}
            autoFocus
            sx={{
              borderColor: "#E5E7EB",
              color: "#374151",
              bgcolor: "#F9FAFB",
              "&:hover": { bgcolor: "#F3F4F6", borderColor: "#D1D5DB" },
            }}
          >
            {cancelText}
          </Button>
          <Button
            fullWidth
            variant="contained"
            color={variant === "danger" ? "error" : "secondary"}
            onClick={onConfirm}
            disableElevation
          >
            {confirmText}
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
};

export default ConfirmDialog;