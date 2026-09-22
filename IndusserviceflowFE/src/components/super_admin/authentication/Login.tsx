import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  ThemeProvider,
  CssBaseline,
  InputAdornment,
  CircularProgress,
} from "@mui/material";
import {
  Visibility,
  VisibilityOff,
  Waves as BrandIcon,
  CheckBox as CheckBadgeIcon,
  LockPersonOutlined,
  Email,
  LockOutlined,
  ArrowForward,
  CheckCircle,
} from "@mui/icons-material";
import { login, acknowledgeFirstLogin } from "../../../services/api";
import { validateLoginIdentifier, validateLoginPassword } from "../../../utils/validators";
import Toast from "../../common/Toast";
import type { ToastType } from "../../common/Toast";
import { useGlobalToast } from "../../common/GlobalToast";
import loginHero from "../../../assets/login-hero.png";
import superAdminMuiTheme, { brandGradient } from "../../../theme/superAdminMuiTheme";

const KEYFRAMES = {
  "@keyframes cardIn": {
    from: { opacity: 0, transform: "translateY(18px) scale(0.98)" },
    to: { opacity: 1, transform: "translateY(0) scale(1)" },
  },
  "@keyframes fadeUp": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
  // Variants of fadeUp that settle at a dimmer resting opacity, for text
  // that should stay slightly translucent once it's finished animating in.
  "@keyframes fadeUpTo92": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 0.92, transform: "translateY(0)" },
  },
  "@keyframes fadeUpTo55": {
    from: { opacity: 0, transform: "translateY(10px)" },
    to: { opacity: 0.55, transform: "translateY(0)" },
  },
  "@keyframes fadeIn": {
    from: { opacity: 0 },
    to: { opacity: 1 },
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
  "@keyframes shake": {
    "0%, 100%": { transform: "translateX(0)" },
    "20%": { transform: "translateX(-6px)" },
    "40%": { transform: "translateX(6px)" },
    "60%": { transform: "translateX(-4px)" },
    "80%": { transform: "translateX(4px)" },
  },
  "@keyframes spinIn": {
    from: { opacity: 0, transform: "scale(0.7)" },
    to: { opacity: 1, transform: "scale(1)" },
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
      {/* Logo row */}
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
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>
            Enterprise-Grade Queue Simulation
          </Typography>
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
          Simulate, Optimize, and Elevate Service Delivery.
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
          Harness real-time queue analytics and Monte Carlo wait-time simulations
          to eliminate bottlenecks while maximizing service efficiency.
        </Typography>
      </Box>

      {/* Footer */}
      <Typography sx={{ fontSize: 11.5, letterSpacing: 0.5, ...fadeUpStep(4, 0.55) }}>
        © 2026 INDUSSERVICEFLOW PLATFORM
      </Typography>
    </Box>
  );
}

function Shell({ children, shake = false }: { children: React.ReactNode; shake?: boolean }) {
  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", display: "flex", ...KEYFRAMES }}>
        <Box
          sx={{
            flex: "0 0 50%",
            display: { xs: "none", md: "block" },
            position: "relative",
            backgroundImage: `linear-gradient(180deg, rgba(6,10,20,0.72) 0%, rgba(6,10,20,0.6) 45%, rgba(6,10,20,0.74) 100%), url(${loginHero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            animation: "heroPan 18s ease-in-out infinite alternate",
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
          <Box sx={{ width: 440, maxWidth: "100%" }}>
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
                animation: `cardIn 0.55s cubic-bezier(0.22,1,0.36,1) forwards${
                  shake ? ", shake 0.45s ease-in-out" : ""
                }`,
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
                  animation: "shimmerBar 4s linear infinite",
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

function FieldLabel({ children, required = false }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Typography
      sx={{
        fontSize: 11.5,
        fontWeight: 700,
        letterSpacing: 0.6,
        color: "text.secondary",
        textTransform: "uppercase",
        mb: 0.75,
      }}
    >
      {children}
      {required && (
        <Box component="span" sx={{ color: "error.main", textTransform: "none" }}>
          {" *"}
        </Box>
      )}
    </Typography>
  );
}
const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: 2,
    backgroundColor: "rgba(124,140,255,0.06)",
    transition: "box-shadow 200ms ease, transform 200ms ease, background-color 200ms ease",
    "& fieldset": { borderColor: "rgba(124,140,255,0.25)", transition: "border-color 200ms ease" },
    "&:hover fieldset": { borderColor: "rgba(124,140,255,0.4)" },
    "&.Mui-focused": {
      backgroundColor: "rgba(124,140,255,0.09)",
      boxShadow: "0 6px 18px rgba(79,70,229,0.15)",
      transform: "translateY(-1px)",
    },
  },
};

function Login() {
  const navigate = useNavigate();
  const { showToast } = useGlobalToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [touched, setTouched] = useState({ username: false, password: false });

  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);
  const [showFirstLoginChoice, setShowFirstLoginChoice] = useState(false);
  const [acknowledging, setAcknowledging] = useState(false);
  const [shake, setShake] = useState(false);

  const usernameError = touched.username ? validateLoginIdentifier(username) : "";
  const passwordError = touched.password ? validateLoginPassword(password) : "";
  const isFormValid = !validateLoginIdentifier(username) && !validateLoginPassword(password);

  const roleRoutes: Record<string, string> = {
    super_admin: "/super-admin/dashboard",
    org_admin: "/org-admin/dashboard",
    employee: "/employee/dashboard",
  };

  const triggerShake = () => {
    setShake(true);
    setTimeout(() => setShake(false), 450);
  };
  const markFirstLoginPromptDismissed = () => {
    const employeeId = localStorage.getItem("employee_id");
    if (employeeId) {
      localStorage.setItem(`password_prompt_dismissed_${employeeId}`, "true");
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ username: true, password: true });

    if (!isFormValid) {
      triggerShake();
      return;
    }

    setLoading(true);

    try {
      const payload = username.includes("@") ? { email: username, password } : { username, password };
      const response = await login(payload);

      const {
        access,
        refresh,
        username: returnedUsername,
        name,
        role,
        org_id,
        organization_name,
        employee_id,
        designation,
        must_change_password,
        first_login,
      } = response.data;

      const normalizedRole = (role || "").toLowerCase();

      localStorage.setItem("access_token", access);
      localStorage.setItem("refresh_token", refresh);
      localStorage.setItem("user_name", returnedUsername);
      localStorage.setItem("name", name || returnedUsername);
      localStorage.setItem("role", normalizedRole);

      if (org_id) {
        localStorage.setItem("org_id", String(org_id));
      }

      localStorage.setItem("org_name", organization_name || "Organization");
      if (normalizedRole === "employee") {
        if (employee_id !== undefined && employee_id !== null) {
          localStorage.setItem("employee_id", String(employee_id));
        } else {
          console.error("Employee login succeeded but the response had no employee_id.");
        }

        if (designation) {
          localStorage.setItem("designation", designation);
        }
      }
      const dismissedKey = employee_id !== undefined && employee_id !== null
        ? `password_prompt_dismissed_${employee_id}`
        : null;
      const alreadyDismissed = dismissedKey ? localStorage.getItem(dismissedKey) === "true" : false;

      const requiresPasswordChange = Boolean(must_change_password ?? first_login) && !alreadyDismissed;

      if (normalizedRole === "employee" && requiresPasswordChange) {
        setShowFirstLoginChoice(true);
        return;
      }

      const destination = roleRoutes[normalizedRole] || "/employee/dashboard";

      navigate(destination);
      showToast({
        type: "success",
        title: "Login Successful",
        message: `Welcome back, ${name || returnedUsername}!`,
      });
    } catch (error: any) {

      const message =
        error.response?.data?.message ||
        error.response?.data?.password ||
        error.response?.data?.username ||
        error.response?.data?.detail ||
        "Invalid username or password.";

      setToast({ type: "error", message });
      triggerShake();
    } finally {
      setLoading(false);
    }
  };
  const handleGoToDashboard = async () => {
    setAcknowledging(true);

    try {
      await acknowledgeFirstLogin();
    } catch (error: any) {
      console.error("Failed to acknowledge first login.", error);
      showToast({
        type: "error",
        title: "Heads up",
        message:
          "Couldn't save that you're past the first-login step - you may see this screen again next time you log in.",
      });
    } finally {
      setAcknowledging(false);
    }

    navigate("/employee/dashboard");
  };

  if (showFirstLoginChoice) {
    return (
      <>
        {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
        <Shell>

        <Box sx={{ display: "flex", justifyContent: "center", mb: 2, ...fadeUpStep(0) }}>
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
              animation: "badgePop 0.6s cubic-bezier(0.22,1,0.36,1) forwards, badgeFloat 3s ease-in-out 0.6s infinite",
            }}
          >
            <CheckCircle sx={{ color: "#fff", fontSize: 26 }} />
          </Box>
        </Box>

        <Typography variant="h5" gutterBottom sx={{ fontWeight: 700, textAlign: "center", ...fadeUpStep(1) }}>
          Welcome aboard!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, textAlign: "center", ...fadeUpStep(2) }}>
          You're signing in with the temporary password your admin set for you. Would you like to
          change it now, or go straight to your dashboard?
        </Typography>

        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, ...fadeUpStep(3) }}>
          <Button
            variant="contained"
            size="large"
            onClick={() => {
              markFirstLoginPromptDismissed();
              navigate("/first-login/change-password", { state: { firstLogin: true } });
            }}
            sx={{
              height: 48,
              borderRadius: 2,
              backgroundImage: brandGradient,
              textTransform: "none",
              fontWeight: 700,
              transition: "transform 150ms ease, box-shadow 150ms ease",
              "&:hover": { transform: "translateY(-2px)", boxShadow: "0 12px 24px rgba(37,99,235,0.35)" },
              "&:active": { transform: "translateY(0)" },
            }}
          >
            Change Password
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            size="large"
            onClick={handleGoToDashboard}
            disabled={acknowledging}
            sx={{
              height: 48,
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 700,
              transition: "transform 150ms ease",
              "&:hover": { transform: "translateY(-2px)" },
              "&:active": { transform: "translateY(0)" },
            }}
          >
            {acknowledging ? <CircularProgress size={22} color="inherit" /> : "Go to Dashboard"}
          </Button>
        </Box>
        </Shell>
      </>
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Shell shake={shake}>
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
          animation: "badgePop 0.6s cubic-bezier(0.22,1,0.36,1) forwards, badgeFloat 3s ease-in-out 0.6s infinite",
        }}
      >
        <LockPersonOutlined sx={{ color: "#fff", fontSize: 26 }} />
      </Box>

      <Typography sx={{ fontWeight: 800, fontSize: 26, mb: 0.5, ...fadeUpStep(0) }}>Sign In</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3.5, fontSize: 14, ...fadeUpStep(1) }}>
        Access your workspace to continue managing queues.
      </Typography>

      <Box component="form" onSubmit={handleLogin} noValidate>
        <Box sx={{ mb: 2.5, ...fadeUpStep(2) }}>
          <FieldLabel required>Username or Email</FieldLabel>
          <TextField
            fullWidth
            placeholder="Enter Email or Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, username: true }))}
            error={Boolean(usernameError)}
            helperText={usernameError}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <Email fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={fieldSx}
          />
        </Box>

        <Box sx={{ mb: 1, ...fadeUpStep(3) }}>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 0.75 }}>
            <FieldLabel required>Password</FieldLabel>
            <Link
              to="/forgot-password"
              state={{ identifier: username }}
              style={{ color: "inherit" }}
            >
              <Typography
                sx={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: "secondary.dark",
                  transition: "opacity 150ms ease",
                  "&:hover": { opacity: 0.7 },
                }}
              >
                Forgot password?
              </Typography>
            </Link>
          </Box>
          <TextField
            fullWidth
            type={showPassword ? "text" : "password"}
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={Boolean(passwordError)}
            helperText={passwordError}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined fontSize="small" sx={{ color: "text.secondary" }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        background: "transparent",
                        border: "none",
                        cursor: "pointer",
                        padding: 0,
                        color: "#616161",
                        transition: "color 150ms ease, transform 150ms ease",
                      }}
                    >
                      {showPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                    </button>
                  </InputAdornment>
                ),
              },
            }}
            sx={fieldSx}
          />
        </Box>

        <Box sx={{ ...fadeUpStep(4) }}>
          <Button
            type="submit"
            fullWidth
            disabled={loading}
            endIcon={
              !loading ? (
                <ArrowForward
                  fontSize="small"
                  sx={{ transition: "transform 200ms ease", ".MuiButton-root:hover &": { transform: "translateX(3px)" } }}
                />
              ) : null
            }
            sx={{
              mt: 3,
              mb: 2.5,
              height: 48,
              borderRadius: 2,
              backgroundImage: "linear-gradient(120deg, #0EA5E9 0%, #2563EB 45%, #4F46E5 100%)",
              backgroundSize: "160% 100%",
              color: "#fff",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 15,
              boxShadow: "0 10px 24px rgba(99,102,241,0.35)",
              transition: "box-shadow 200ms ease, transform 150ms ease, background-position 400ms ease",
              "&:hover": {
                boxShadow: "0 14px 30px rgba(99,102,241,0.45)",
                backgroundPosition: "100% 0",
                transform: "translateY(-2px)",
              },
              "&:active": { transform: "translateY(0)" },
              "&.Mui-disabled": { color: "#fff", opacity: 0.85 },
            }}
          >
            {loading ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, animation: "spinIn 200ms ease-out" }}>
                <CircularProgress size={17} thickness={5} sx={{ color: "#fff" }} />
                Signing in...
              </Box>
            ) : (
              "Sign In"
            )}
          </Button>
        </Box>

        <Box sx={{ borderTop: "1px solid", borderColor: "divider", pt: 2.5, ...fadeUpStep(5) }}>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: "center", fontSize: 13.5 }}>
            Don't have an account?{" "}
            <Link to="/register" style={{ color: "inherit" }}>
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
                Register Organization
              </Typography>
            </Link>
          </Typography>
        </Box>
      </Box>
      </Shell>
    </>
  );
}

export default Login;