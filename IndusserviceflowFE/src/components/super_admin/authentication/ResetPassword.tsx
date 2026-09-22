import { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  IconButton,
  ThemeProvider,
  CssBaseline,
  Collapse,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  CheckCircle,
  RadioButtonUnchecked,
  Waves as BrandIcon,
  CheckBox as CheckBadgeIcon,
  LockPersonOutlined,
} from "@mui/icons-material";
import { resetPassword } from "../../../services/api";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import loginHero from "../../../assets/login-hero.png";
import superAdminMuiTheme, { brandGradient } from "../../../theme/superAdminMuiTheme";

const AUTH_KEYFRAMES = {
  "@keyframes cardIn": {
    from: { opacity: 0, transform: "translateY(18px) scale(0.98)" },
    to: { opacity: 1, transform: "translateY(0) scale(1)" },
  },
  "@keyframes fadeUp": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  "@keyframes fadeUpTo92": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 0.92, transform: "translateY(0)" },
  },
  "@keyframes fadeUpTo55": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 0.55, transform: "translateY(0)" },
  },
  "@keyframes badgePop": {
    "0%": { opacity: 0, transform: "scale(0.5) rotate(-8deg)" },
    "60%": { opacity: 1, transform: "scale(1.08) rotate(2deg)" },
    "100%": { opacity: 1, transform: "scale(1) rotate(0deg)" },
  },
  "@keyframes badgeFloat": {
    "0%, 100%": { transform: "translateY(0)" },
    "50%": { transform: "translateY(-4px)" },
  },
  "@keyframes shimmerBar": {
    "0%": { backgroundPosition: "0% 50%" },
    "100%": { backgroundPosition: "200% 50%" },
  },
  "@keyframes heroPan": {
    "0%": { backgroundPosition: "50% 50%" },
    "100%": { backgroundPosition: "54% 46%" },
  },
};

const fadeUpStep = (index: number, restOpacity = 1) => ({
  opacity: 0,
  animation: `fadeUp${restOpacity !== 1 ? `To${Math.round(restOpacity * 100)}` : ""} 0.5s ease-out forwards`,
  animationDelay: `${0.15 + index * 0.08}s`,
});

const badgeAnimation =
  "badgePop 0.6s cubic-bezier(0.22,1,0.36,1) forwards, badgeFloat 3s ease-in-out 0.6s infinite";
const heroPanAnimation = "heroPan 18s ease-in-out infinite alternate";
const shimmerBarAnimation = "shimmerBar 4s linear infinite";

function HeroPanel() {
  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        flexDirection: "column",
        justifyContent: "space-between",
        flex: "0 0 50%",
        color: "#fff",
        height: "100vh",
        position: "sticky",
        top: 0,
        boxSizing: "border-box",
        p: { md: 5, lg: 6 },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, ...fadeUpStep(0) }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            flexShrink: 0,
          }}
        >
          <BrandIcon sx={{ fontSize: 21 }} />
        </Box>
        <Typography sx={{ fontWeight: 800, fontSize: 19, letterSpacing: 0.2 }}>
          Indus<Box component="span" sx={{ color: "#7c8cff" }}>ServiceFlow</Box>
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 520, mb: 10 }}>
        <Box
          sx={{
            display: "inline-flex",
            alignItems: "center",
            gap: 0.75,
            px: 1.5,
            py: 0.5,
            mb: 2.5,
            borderRadius: "999px",
            border: "1px solid rgba(255,255,255,0.18)",
            backgroundColor: "rgba(255,255,255,0.06)",
            ...fadeUpStep(1),
          }}
        >
          <CheckBadgeIcon sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Secure Account Recovery</Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 800,
            fontSize: { md: 34, lg: 40 },
            lineHeight: 1.18,
            mb: 2,
            textShadow: "0 2px 12px rgba(0,0,0,0.55)",
            ...fadeUpStep(2),
          }}
        >
          One strong password away from getting back in.
        </Typography>

        <Typography
          variant="body2"
          sx={{
            fontSize: 14.5,
            lineHeight: 1.6,
            maxWidth: 440,
            textShadow: "0 1px 8px rgba(0,0,0,0.5)",
            ...fadeUpStep(3, 0.92),
          }}
        >
          Choose a new password that meets every requirement below to keep your organisation's
          data safe.
        </Typography>
      </Box>

      <Typography sx={{ fontSize: 11.5, letterSpacing: 0.5, ...fadeUpStep(4, 0.55) }}>
        © 2026 INDUSSERVICEFLOW PLATFORM
      </Typography>
    </Box>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", display: "flex", ...AUTH_KEYFRAMES }}>
        <Box
          sx={{
            flex: "0 0 50%",
            display: { xs: "none", md: "block" },
            position: "relative",
            backgroundImage: `linear-gradient(180deg, rgba(6,10,20,0.72) 0%, rgba(6,10,20,0.6) 45%, rgba(6,10,20,0.74) 100%), url(${loginHero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            animation: heroPanAnimation,
          }}
        >
          <HeroPanel />
        </Box>

        <Box
          sx={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            p: 2,
            backgroundColor: "#f4f6fb",
            backgroundImage:
              "radial-gradient(circle at 85% 15%, rgba(14,165,233,0.08), transparent 45%), radial-gradient(circle at 15% 85%, rgba(79,70,229,0.08), transparent 45%)",
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

interface Rule {
  key: string;
  label: string;
  test: (v: string) => boolean;
}

const RULES: Rule[] = [
  { key: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
  { key: "special", label: "One special character", test: (v) => /[^A-Za-z0-9]/.test(v) },
];

const STRENGTH_META = [
  { label: "Very weak", color: "#DC2626" },
  { label: "Weak", color: "#DC2626" },
  { label: "Fair", color: "#D97706" },
  { label: "Good", color: "#0EA5E9" },
  { label: "Strong", color: "#059669" },
  { label: "Excellent", color: "#059669" },
];

function ResetPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = location.state as { identifier?: string; otp?: string } | null;
  const identifier = state?.identifier;
  const otp = state?.otp;

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newFieldFocused, setNewFieldFocused] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resettingPassword, setResettingPassword] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(
    null,
  );

  if (!identifier || !otp) {
    return <Navigate to="/forgot-password" replace />;
  }

  const passedRules = useMemo(
    () => RULES.filter((r) => r.test(newPassword)),
    [newPassword]
  );
  const strengthScore = newPassword ? passedRules.length : 0;
  const strengthMeta = STRENGTH_META[strengthScore];
  const showChecklist = newFieldFocused || newPassword.length > 0;

  const confirmTouched = confirmPassword.length > 0;
  const passwordsMatch = confirmTouched && newPassword === confirmPassword;
  const passwordsMismatch = confirmTouched && newPassword !== confirmPassword;

  const passwordIsStrongEnough = passedRules.length === RULES.length;
  const canSubmit = passwordIsStrongEnough && passwordsMatch && !resettingPassword;

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError("");

    if (!canSubmit) return;

    setResettingPassword(true);
    try {
      await resetPassword({
        username: identifier,
        otp,
        new_password: newPassword,
        confirm_password: confirmPassword,
      });
      setToast({
        type: "success",
        message: "Password reset successful! Please sign in with your new password.",
      });
      setTimeout(() => navigate("/login"), 1200);
    } catch (err: unknown) {
      const data =
        err && typeof err === "object" && "response" in err
          ? (err as { response?: { data?: unknown } }).response?.data
          : undefined;

      const errorData =
        data && typeof data === "object" ? (data as { message?: unknown; [key: string]: unknown }) : undefined;

      const message =
        typeof errorData?.message === "string"
          ? errorData.message
          : errorData && typeof errorData === "object"
            ? Object.values(errorData)
                .flatMap((value) => (Array.isArray(value) ? value : [value]))
                .filter((value): value is string => typeof value === "string")
                .join(" ") || "Unable to reset password. Please try again."
            : "Unable to reset password. Please try again.";

      setResetError(message);
      setToast({ type: "error", message });
    } finally {
      setResettingPassword(false);
    }
  };

  const strengthMeter = (
    <Collapse in={newPassword.length > 0}>
      <Box sx={{ mt: 1.25, mb: 0.5 }}>
        <Box sx={{ display: "flex", flexDirection: "row", gap: 0.75, mb: 0.75 }}>
          {RULES.map((_, i) => (
            <Box
              key={i}
              sx={{
                height: 5,
                flex: 1,
                borderRadius: 3,
                bgcolor: i < strengthScore ? strengthMeta.color : "#E4EEF6",
                transition: "background-color 200ms ease",
              }}
            />
          ))}
        </Box>
        <Typography variant="caption" sx={{ fontWeight: 700, color: strengthScore > 0 ? strengthMeta.color : "text.secondary" }}>
          {newPassword ? strengthMeta.label : ""}
        </Typography>
      </Box>
    </Collapse>
  );

  const requirementsChecklist = (
    <Collapse in={showChecklist}>
      <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: "#F7FBFF", border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 1.5, rowGap: 0.5 }}>
          {RULES.map((rule) => {
            const passed = rule.test(newPassword);
            return (
              <Box
                key={rule.key}
                sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 0.75, color: passed ? "success.main" : "text.secondary" }}
              >
                {passed ? <CheckCircle sx={{ fontSize: 16 }} /> : <RadioButtonUnchecked sx={{ fontSize: 16, opacity: 0.5 }} />}
                <Typography variant="caption" sx={{ fontWeight: passed ? 600 : 400 }}>
                  {rule.label}
                </Typography>
              </Box>
            );
          })}
        </Box>
      </Box>
    </Collapse>
  );

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Shell>
        <Box sx={{ width: 430, maxWidth: "100%" }}>
        <Paper
          elevation={0}
          sx={{
            position: "relative",
            width: "100%",
            p: 4.5,
            pt: 5,
            borderRadius: 3,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 16px 40px rgba(14,60,97,0.16)",
            animation: "cardIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards",
          }}
        >
          <Box
            sx={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: 5,
              backgroundImage: "linear-gradient(90deg, #0EA5E9, #2563EB, #4F46E5, #0EA5E9)",
              backgroundSize: "200% 100%",
              animation: shimmerBarAnimation,
            }}
          />

          <Box
            sx={{
              width: 54,
              height: 54,
              borderRadius: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: brandGradient,
              boxShadow: "0 8px 20px rgba(37,99,235,0.30)",
              mb: 2,
              animation: badgeAnimation,
            }}
          >
            <LockPersonOutlined sx={{ color: "#fff", fontSize: 26 }} />
          </Box>

          <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, ...fadeUpStep(0) }}>
            Reset Password
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, ...fadeUpStep(1) }}>
            Enter your new password below.
          </Typography>

          <Box component="form" onSubmit={handleResetPassword} noValidate>
            <Box sx={{ ...fadeUpStep(2) }}>
              <TextField
                fullWidth
                required
                type={showNewPassword ? "text" : "password"}
                label="New Password"
                placeholder="Enter New Password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onFocus={() => setNewFieldFocused(true)}
                margin="normal"
                slotProps={{ input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowNewPassword(!showNewPassword)} edge="end" size="small">
                        {showNewPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                } }}
              />
              {strengthMeter}
              {requirementsChecklist}
            </Box>

            <Box sx={{ ...fadeUpStep(3) }}>
              <TextField
                fullWidth
                required
                type={showConfirmPassword ? "text" : "password"}
                label="Confirm Password"
                placeholder="Re-enter New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                margin="normal"
                error={passwordsMismatch}
                slotProps={{ input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={() => setShowConfirmPassword(!showConfirmPassword)} edge="end" size="small">
                        {showConfirmPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                } }}
              />
              <Collapse in={confirmTouched}>
                <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 0.75, mt: 0.75, color: passwordsMatch ? "success.main" : "error.main" }}>
                  {passwordsMatch ? <CheckCircle sx={{ fontSize: 16 }} /> : <RadioButtonUnchecked sx={{ fontSize: 16 }} />}
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {passwordsMatch ? "Passwords match" : "Passwords don't match"}
                  </Typography>
                </Box>
              </Collapse>
            </Box>

            {resetError && (
              <Typography variant="body2" color="error.main" sx={{ mt: 1 }}>
                {resetError}
              </Typography>
            )}

            <Box sx={{ ...fadeUpStep(4) }}>
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={!canSubmit}
                sx={{
                  mt: 2.5,
                  height: 46,
                  transition: "transform 150ms ease, box-shadow 150ms ease",
                  "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 24px rgba(37,99,235,0.35)" },
                  "&:active": { transform: "translateY(0)" },
                }}
              >
                {resettingPassword ? "Resetting…" : "Reset Password"}
              </Button>
            </Box>
          </Box>
        </Paper>
        </Box>
      </Shell>
    </>
  );
}

export default ResetPassword;