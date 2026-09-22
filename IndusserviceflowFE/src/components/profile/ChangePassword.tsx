import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  ThemeProvider,
  CssBaseline,
  Alert,
  Collapse,
} from "@mui/material";
import {
  VpnKey as KeyIcon,
  Visibility,
  VisibilityOff,
  CheckCircle,
  RadioButtonUnchecked,
  Waves as BrandIcon,
  CheckBox as CheckBadgeIcon,
} from "@mui/icons-material";

import { changeOrgPassword } from "../../services/api";
import { validateNewPasswordDiffersFromOld } from "../../utils/validators";
import loginHero from "../../assets/login-hero.png";
import superAdminMuiTheme, { brandGradient } from "../../theme/superAdminMuiTheme";

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
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
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
          }}
        >
          <CheckBadgeIcon sx={{ fontSize: 13 }} />
          <Typography sx={{ fontSize: 12, fontWeight: 600 }}>Almost There</Typography>
        </Box>

        <Typography
          sx={{
            fontFamily: "'Sora', sans-serif",
            fontWeight: 800,
            fontSize: { md: 34, lg: 40 },
            lineHeight: 1.18,
            mb: 2,
            textShadow: "0 2px 12px rgba(0,0,0,0.55)",
          }}
        >
          Set a password that's truly yours.
        </Typography>

        <Typography
          variant="body2"
          sx={{ opacity: 0.92, fontSize: 14.5, lineHeight: 1.6, maxWidth: 440, textShadow: "0 1px 8px rgba(0,0,0,0.5)" }}
        >
          You're signing in with a temporary password your admin created — choose your own to
          finish setting up your account.
        </Typography>
      </Box>

      <Typography sx={{ opacity: 0.55, fontSize: 11.5, letterSpacing: 0.5 }}>
        © 2026 INDUSSERVICEFLOW PLATFORM
      </Typography>
    </Box>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box sx={{ minHeight: "100vh", display: "flex" }}>
        <Box
          sx={{
            flex: "0 0 50%",
            display: { xs: "none", md: "block" },
            position: "relative",
            backgroundImage: `linear-gradient(180deg, rgba(6,10,20,0.72) 0%, rgba(6,10,20,0.6) 45%, rgba(6,10,20,0.74) 100%), url(${loginHero})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
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
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
const blockPaste = (e: React.ClipboardEvent<HTMLInputElement>) => e.preventDefault();

interface ChangePasswordProps {
  standalone?: boolean;
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
function isStrongPassword(password: string): boolean {
  return RULES.every((rule) => rule.test(password));
}

const PASSWORD_MISMATCH_ERROR = "Passwords don't match.";

const ChangePassword: React.FC<ChangePasswordProps> = ({ standalone = false }) => {
  const location = useLocation();
  const navigate = useNavigate();

  const isFirstLogin = standalone || Boolean((location.state as { firstLogin?: boolean } | null)?.firstLogin);

  const [pwForm, setPwForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [, setTouched] = useState<Record<string, boolean>>({});

  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [newFieldFocused, setNewFieldFocused] = useState(false);
  const fieldErrors = useMemo(() => {
    const next: Record<string, string> = {};
    if (!pwForm.old_password) next.old_password = "Current password is required.";

    if (!pwForm.new_password) next.new_password = "New password is required.";
    else if (!isStrongPassword(pwForm.new_password)) next.new_password = "Password doesn't meet all requirements.";

    if (!pwForm.confirm_password) next.confirm_password = "Please confirm your new password.";
    else if (pwForm.new_password && pwForm.confirm_password !== pwForm.new_password) {
      next.confirm_password = PASSWORD_MISMATCH_ERROR;
    }

    return next;
  }, [pwForm]);

  const goToDashboard = () => navigate("/employee/dashboard");

  const passedRules = useMemo(
    () => RULES.filter((r) => r.test(pwForm.new_password)),
    [pwForm.new_password]
  );
  const strengthScore = pwForm.new_password ? passedRules.length : 0;
  const strengthMeta = STRENGTH_META[strengthScore];
  const showChecklist = newFieldFocused || pwForm.new_password.length > 0;

  const confirmTouched = pwForm.confirm_password.length > 0;
  const passwordsMatch = confirmTouched && pwForm.new_password === pwForm.confirm_password;
  const passwordsMismatch = confirmTouched && pwForm.new_password !== pwForm.confirm_password;

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwError(null);
    setPwSuccess(null);
    setTouched({ old_password: true, new_password: true, confirm_password: true });

    if (Object.keys(fieldErrors).length > 0) {
      setPwError("Please fix the highlighted fields before continuing.");
      return;
    }
    if (passedRules.length < RULES.length) {
      setPwError("Your new password doesn't meet all the requirements below.");
      return;
    }
    const reuseError = validateNewPasswordDiffersFromOld(pwForm.new_password, pwForm.old_password);
    if (reuseError) {
      setPwError(reuseError);
      return;
    }

    setSavingPassword(true);
    try {
      const response = await changeOrgPassword(pwForm);
      setPwSuccess(response?.message ?? "Password changed successfully.");
      setPwForm({ old_password: "", new_password: "", confirm_password: "" });
      setTouched({});
    } catch (err: any) {
      console.error("Failed to change password:", err);
      setPwError(err?.response?.data?.message ?? "Unable to change password. Please try again.");
    } finally {
      setSavingPassword(false);
    }
  };

  useEffect(() => {
    if (!isFirstLogin || !pwSuccess) return;
    const timer = setTimeout(goToDashboard, 1200);
    return () => clearTimeout(timer);
  }, [isFirstLogin, pwSuccess]);

  const header = (
    <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: 2, mb: 3 }}>
      <Box
        sx={{
          width: 52,
          height: 52,
          borderRadius: "14px",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundImage: brandGradient,
          boxShadow: "0 8px 20px rgba(37,99,235,0.30)",
        }}
      >
        <KeyIcon sx={{ color: "#fff", fontSize: 26 }} />
      </Box>
      <Box>
        <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.25 }}>
          Change password
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Choose a strong password you don't use anywhere else
        </Typography>
      </Box>
    </Box>
  );

  const eyeAdornment = (shown: boolean, toggle: () => void, labelFor: string) => (
    <InputAdornment position="end">
      <IconButton size="small" onClick={toggle} edge="end" aria-label={shown ? `Hide ${labelFor}` : `Show ${labelFor}`} tabIndex={-1}>
        {shown ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
      </IconButton>
    </InputAdornment>
  );

  const strengthMeter = (
    <Collapse in={pwForm.new_password.length > 0}>
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
          {pwForm.new_password ? strengthMeta.label : ""}
        </Typography>
      </Box>
    </Collapse>
  );

  const requirementsChecklist = (
    <Collapse in={showChecklist}>
      <Box sx={{ mt: 1, p: 1.5, borderRadius: 2, bgcolor: "#F7FBFF", border: "1px solid", borderColor: "divider" }}>
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, columnGap: 1.5, rowGap: 0.5 }}>
          {RULES.map((rule) => {
            const passed = rule.test(pwForm.new_password);
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

  const form = (
    <>
      {isFirstLogin && (
        <Alert
          severity="info"
          sx={{ mb: 3, borderRadius: 2, alignItems: "center" }}
          action={
            <Button color="inherit" size="small" onClick={goToDashboard} sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
              Skip for now
            </Button>
          }
        >
          You're signing in with the password your admin set for you. We recommend changing it now.
        </Alert>
      )}

      <Box component="form" onSubmit={handleChangePassword} noValidate>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
          <Box>
            <TextField
              fullWidth
              required
              label="Current password"
              type={showOldPassword ? "text" : "password"}
              value={pwForm.old_password}
              onChange={(e) => setPwForm({ ...pwForm, old_password: e.target.value })}
              placeholder="Enter current password"
              autoComplete="current-password"
              onPaste={blockPaste}
              onCopy={blockPaste as any}
              slotProps={{
                input: {
                  endAdornment: eyeAdornment(showOldPassword, () => setShowOldPassword((p) => !p), "current password"),
                },
              }}
            />
            <Collapse in={!!pwError}>
              <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }} onClose={() => setPwError(null)}>
                {pwError}
              </Alert>
            </Collapse>
          </Box>

          <Box>
            <TextField
              fullWidth
              required
              label="New password"
              type={showNewPassword ? "text" : "password"}
              value={pwForm.new_password}
              onChange={(e) => setPwForm({ ...pwForm, new_password: e.target.value })}
              onFocus={() => setNewFieldFocused(true)}
              onPaste={blockPaste}
              onCopy={blockPaste as any}
              placeholder="Enter new password"
              autoComplete="new-password"
              slotProps={{
                input: {
                  endAdornment: eyeAdornment(showNewPassword, () => setShowNewPassword((p) => !p), "new password"),
                },
              }}
            />
            {strengthMeter}
            {requirementsChecklist}
          </Box>

          <Box>
            <TextField
              fullWidth
              required
              label="Confirm new password"
              type={showConfirmPassword ? "text" : "password"}
              value={pwForm.confirm_password}
              onChange={(e) => setPwForm({ ...pwForm, confirm_password: e.target.value })}
              placeholder="Re-enter new password"
              autoComplete="new-password"
              onPaste={blockPaste}
              onCopy={blockPaste as any}
              error={passwordsMismatch}
              slotProps={{
                input: {
                  endAdornment: eyeAdornment(showConfirmPassword, () => setShowConfirmPassword((p) => !p), "confirm password"),
                },
              }}
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
          <Box>
            <Collapse in={!!pwSuccess}>
              <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
                {pwSuccess}
                {isFirstLogin && " Taking you to your dashboard…"}
              </Alert>
            </Collapse>
            <Button type="submit" variant="contained" size="large" disabled={savingPassword} fullWidth sx={{ height: 48, fontSize: "0.95rem" }}>
              {savingPassword ? "Updating…" : "Update password"}
            </Button>
          </Box>
        </Box>
      </Box>
    </>
  );

  if (standalone) {
    return (
      <Shell>
        <Paper
          elevation={0}
          sx={{
            width: 480,
            maxWidth: "100%",
            p: { xs: 3, sm: 4.5 },
            borderRadius: 4,
            border: "1px solid",
            borderColor: "divider",
            boxShadow: "0 18px 44px rgba(14,60,97,0.12)",
          }}
        >
          {header}
          {form}
        </Paper>
      </Shell>
    );
  }

  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box
        sx={{
          px: { xs: 2, md: 4 },
          py: 3.5,
          minHeight: "calc(100vh - 120px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Paper variant="outlined" sx={{ p: { xs: 3, sm: 4 }, borderRadius: 4, width: "100%", maxWidth: 540 }}>
          {header}
          {form}
        </Paper>
      </Box>
    </ThemeProvider>
  );
};

export default ChangePassword;