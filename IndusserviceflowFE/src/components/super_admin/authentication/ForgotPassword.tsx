import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  InputAdornment,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";
import {
  CheckCircle,
  MailLockOutlined,
  PersonOutlined,
  PinOutlined,
  ShieldOutlined,
  Waves as BrandIcon,
  CheckBox as CheckBadgeIcon,
} from "@mui/icons-material";
import {
  requestPasswordResetOtp,
  verifyPasswordResetOtp,
} from "../../../services/api";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import { validateEmailOrUsername } from "../../../utils/validators";
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
        position: "relative",
        color: "#fff",
        height: "100vh",
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
          Let's get you back into your account.
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
          Verify your identity with a one-time code sent to your registered email, then choose a
          fresh password to keep your workspace secure.
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
          <Box sx={{ width: 460, maxWidth: "100%" }}>
            <Paper
              elevation={0}
              sx={{
                position: "relative",
                width: "100%",
                p: { xs: 3.5, sm: 4.5 },
                pt: 5,
                borderRadius: 4,
                overflow: "hidden",
                border: "1px solid",
                borderColor: "divider",
                boxShadow: "0 20px 48px rgba(14,24,80,0.10)",
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
              {children}
            </Paper>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

function StepTracker({ step }: { step: 1 | 2 }) {
  const steps = [
    { n: 1, label: "Verify Identity" },
    { n: 2, label: "Enter OTP" },
  ];
  return (
    <Box sx={{ display: "flex", alignItems: "center", mb: 3.5 }}>
      {steps.map((s, i) => {
        const state = s.n < step ? "done" : s.n === step ? "active" : "pending";
        return (
          <Box key={s.n} sx={{ display: "flex", alignItems: "center", flex: i === steps.length - 1 ? "0 0 auto" : 1 }}>
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0.5 }}>
              <Box
                sx={{
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  transition: "all 200ms ease",
                  ...(state === "done" && {
                    backgroundImage: brandGradient,
                    color: "#fff",
                  }),
                  ...(state === "active" && {
                    bgcolor: "#fff",
                    color: "secondary.dark",
                    border: "2px solid",
                    borderColor: "secondary.main",
                  }),
                  ...(state === "pending" && {
                    bgcolor: "#EEF4FA",
                    color: "text.secondary",
                  }),
                }}
              >
                {state === "done" ? <CheckCircle sx={{ fontSize: 16 }} /> : s.n}
              </Box>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: state === "pending" ? 500 : 700,
                  color: state === "pending" ? "text.secondary" : "text.primary",
                  whiteSpace: "nowrap",
                  fontSize: 11.5,
                }}
              >
                {s.label}
              </Typography>
            </Box>
            {i === 0 && (
              <Box
                sx={{
                  flex: 1,
                  height: 2,
                  mx: 1,
                  mb: 2.25,
                  borderRadius: 1,
                  backgroundImage: step > 1 ? brandGradient : "none",
                  bgcolor: step > 1 ? "transparent" : "#EEF4FA",
                  transition: "background-image 250ms ease",
                }}
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
}

type ForgotPasswordNavState = {
  identifier?: string;
  otpSent?: boolean;
};

function ForgotPassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const navState = (location.state as ForgotPasswordNavState | null) ?? null;
  const [identifier, setIdentifier] = useState(navState?.identifier ?? "");
  const [identifierError, setIdentifierError] = useState("");
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(navState?.otpSent ?? false);

  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [resendMessage, setResendMessage] = useState("");
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const syncHistoryState = (next: ForgotPasswordNavState) => {
    navigate(location.pathname, { replace: true, state: { ...navState, ...next } });
  };

  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIdentifierError("");
    const validationMessage = validateEmailOrUsername(identifier);
    if (validationMessage) {
      setIdentifierError(validationMessage);
      return;
    }

    setSendingOtp(true);
    try {
      await requestPasswordResetOtp({ username: identifier });
      setOtpSent(true);
      setVerified(false);
      setOtp("");
      syncHistoryState({ identifier, otpSent: true });
      setToast({ type: "success", message: "OTP sent successfully." });
    } catch (err: any) {
      const message =
        err?.response?.data?.message ??
        "OTP could not be sent. Please check the details and try again.";
      setIdentifierError(message);
      setToast({ type: "error", message: "OTP not sent. " + message });
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError("");
    setResendMessage("");

    if (!otp.trim()) {
      setOtpError("OTP is required.");
      return;
    }

    setVerifying(true);
    try {
      await verifyPasswordResetOtp({ username: identifier, otp });
      setVerified(true);
    } catch (err: any) {
      setVerified(false);
      setOtpError(
        err?.response?.data?.message ?? "Invalid or expired OTP. Please try again."
      );
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setOtpError("");
    setResendMessage("");
    setVerified(false);
    setOtp("");
    try {
      await requestPasswordResetOtp({ username: identifier });
      setResendMessage("A new OTP has been sent to your email.");
      setToast({ type: "success", message: "OTP sent successfully." });
    } catch (err: any) {
      const message = err?.response?.data?.message ?? "Unable to resend OTP. Please try again.";
      setOtpError(message);
      setToast({ type: "error", message: "OTP not sent. " + message });
    }
  };

  const handleContinue = () => {
    navigate("/forgot-password/reset-password", {
      state: { identifier, otp },
    });
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Shell>
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
        <MailLockOutlined sx={{ color: "#fff", fontSize: 26 }} />
      </Box>

      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, ...fadeUpStep(0) }}>
        Forgot Password
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, ...fadeUpStep(1) }}>
        {otpSent
          ? "Enter the OTP we sent to your registered email to continue."
          : "No worries — enter your email or username and we'll send you an OTP."}
      </Typography>

      <Box sx={{ ...fadeUpStep(2) }}>
        <StepTracker step={otpSent ? 2 : 1} />
      </Box>

      <Box sx={{ ...fadeUpStep(3) }}>
        <Box component="form" onSubmit={handleRequestOtp} noValidate>
          <TextField
            fullWidth
            required
            label="Email or Username"
            placeholder="Enter Email or Username"
            value={identifier}
            disabled={otpSent}
            onChange={(e) => {
              setIdentifier(e.target.value);
              setIdentifierError("");
            }}
            error={Boolean(identifierError)}
            helperText={identifierError}
            margin="normal"
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <PersonOutlined sx={{ fontSize: 19, color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
          />

          {!otpSent && (
            <Button type="submit" fullWidth variant="contained" size="large" disabled={sendingOtp} sx={{ mt: 1.5, height: 46 }}>
              {sendingOtp ? "Sending OTP…" : "Send OTP"}
            </Button>
          )}
        </Box>

        {otpSent && (
          <Box component="form" onSubmit={handleVerifyOtp} sx={{ mt: 1.5 }} noValidate>
            <TextField
              fullWidth
              required
              label="OTP"
              placeholder="Enter 6-digit OTP"
              inputMode="numeric"
              value={otp}
              disabled={verified}
              onChange={(e) => {
                setOtp(e.target.value);
                setVerified(false);
                setOtpError("");
              }}
              error={Boolean(otpError)}
              helperText={otpError}
              margin="normal"
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <PinOutlined sx={{ fontSize: 19, color: "text.secondary" }} />
                    </InputAdornment>
                  ),
                  endAdornment: verified ? (
                    <InputAdornment position="end">
                      <CheckCircle color="success" fontSize="small" />
                    </InputAdornment>
                  ) : undefined,
                  sx: { letterSpacing: verified ? "normal" : 2 },
                },
              }}
            />
            {verified && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  mt: -0.5,
                  mb: 1,
                  px: 1.25,
                  py: 0.75,
                  borderRadius: 2,
                  bgcolor: "success.light",
                  color: "success.main",
                  width: "fit-content",
                  animation: "fadeUp 0.3s ease-out forwards",
                }}
              >
                <ShieldOutlined sx={{ fontSize: 16 }} />
                <Typography variant="caption" sx={{ fontWeight: 700 }}>
                  Identity verified
                </Typography>
              </Box>
            )}

            {!verified ? (
              <Button type="submit" fullWidth variant="contained" size="large" disabled={verifying} sx={{ mt: 1.5, height: 46 }}>
                {verifying ? "Verifying…" : "Verify OTP"}
              </Button>
            ) : (
              <Button fullWidth variant="contained" size="large" onClick={handleContinue} sx={{ mt: 1.5, height: 46 }}>
                Continue
              </Button>
            )}

            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", mt: 2.5 }}>
              Didn't get the code?{" "}
              <Box
                component="span"
                onClick={handleResendOtp}
                sx={{
                  cursor: "pointer",
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "secondary.dark",
                  transition: "opacity 150ms ease",
                  "&:hover": { opacity: 0.7 },
                }}
              >
                Resend OTP
              </Box>
            </Typography>
            {resendMessage && (
              <Typography variant="body2" color="success.main" sx={{ textAlign: "center", mt: 1 }}>
                {resendMessage}
              </Typography>
            )}
          </Box>
        )}

        {!otpSent && (
          <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2.5, mt: 2.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", fontSize: 13.5 }}>
              Remembered your password?{" "}
              <Link to="/login" style={{ color: "inherit" }}>
                <Typography
                  component="span"
                  variant="body2"
                  sx={{
                    fontWeight: 700,
                    color: "secondary.dark",
                    transition: "opacity 150ms ease",
                    "&:hover": { opacity: 0.7 },
                  }}
                >
                  Back to Sign In
                </Typography>
              </Link>
            </Typography>
          </Box>
        )}
      </Box>
      </Shell>
    </>
  );
}

export default ForgotPassword;