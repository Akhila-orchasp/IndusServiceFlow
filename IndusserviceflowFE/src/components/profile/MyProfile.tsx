import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Chip,
  IconButton,
  Stack,
  Divider,
  Tabs,
  Tab,
  Card,
  alpha,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";
import {
  Shield as ShieldIcon,
  Business as BuildingIcon,
  CalendarMonth as CalendarIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  Person as UserIcon,
  AccessTime as ClockIcon,
  Edit as EditIcon,
  CameraAlt as CameraIcon,
  Close as CloseIcon,
  Check as CheckIcon,
  VpnKey as KeyIcon,
  ChevronRight as ChevronRightIcon,
  Delete as DeleteIcon,
  VerifiedUser as VerifiedIcon,
  BadgeOutlined as BadgeIcon,
  ShieldOutlined as SecurityTabIcon,
  Fingerprint as CredentialsTabIcon,
  CardMembership as PlanIcon,
  AutoAwesome as MagicIcon,
  Bolt as BoltIcon,
  Groups as UsersGroupIcon,
  Star as StarIcon,
  WorkspacePremium as CurrentPlanIcon,
  LocationOn as LocationIcon,
  Badge as PanIcon,
  ReceiptLong as GstIcon,
  Public as CountryIcon,
} from "@mui/icons-material";

import { getOrgProfile, updateOrgProfile, getPublicPlans } from "../../services/api";
import superAdminMuiTheme, { brandGradient } from "../../theme/superAdminMuiTheme";
import Toast from "../common/Toast";
import type { ToastType } from "../common/Toast";
import { validateEmail, validateMobile, validateNameField, sanitizeMobileInput } from "../../utils/validators";
import useSubscriptionStatus from "../../hooks/useSubscriptionStatus";
import RenewPlanDialog from "../subscription/RenewPlanDialog";
import type { PublicPlan, SubscriptionStatus } from "../../types/subscription";

interface ProfileData {
  id: number;
  name: string;
  username: string;
  email: string;
  mobile: string;
  organization: string | null;
  role: string;
  status: string; // "active" | "inactive"
  created_by: string | null;
  created_on: string;
  updated_by: string | null;
  updated_on: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
  pan_number?: string | null;
  gst_number?: string | null;
}

const formatDate = (value?: string) => {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
};

const formatLabel = (value?: string) => {
  if (!value) return "—";
  return value
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

const PLAN_STATUS_META: Record<SubscriptionStatus, { label: string; color: "success" | "warning" | "error" | "default" }> = {
  active: { label: "Active", color: "success" },
  expiring_soon: { label: "Expiring soon", color: "warning" },
  expired: { label: "Expired", color: "error" },
  locked: { label: "Expired", color: "error" },
  cancelled: { label: "Cancelled", color: "default" },
  pending_payment: { label: "Payment pending", color: "warning" },
  pending_activation: { label: "Pending activation", color: "warning" },
};

const initialsOf = (name?: string) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase();
};
const formatFullAddress = (profile: {
  address?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
}) => {
  const cityStateZip = [profile.city, profile.state].filter(Boolean).join(", ");
  const line2 = [cityStateZip, profile.pincode].filter(Boolean).join(" ");
  const parts = [profile.address, line2, profile.country].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
};

const splitName = (name?: string) => {
  if (!name) return { first: "—", last: "—" };
  const parts = name.trim().split(/\s+/);
  const first = parts[0] ?? "—";
  const last = parts.length > 1 ? parts.slice(1).join(" ") : "—";
  return { first, last };
};
const CredentialBox = ({
  icon,
  label,
  value,
  editable,
  isEditing,
  inputValue,
  onChange,
  placeholder,
  type = "text",
  maxLength,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  editable?: boolean;
  isEditing?: boolean;
  inputValue?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  type?: string;
  maxLength?: number;
}) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "flex-start",
      gap: 1.5,
      p: 2,
      borderRadius: 3,
      border: "1px solid",
      borderColor: "divider",
      minWidth: 0,
    }}
  >
    <Box
      sx={{
        width: 34,
        height: 34,
        borderRadius: "9px",
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "#F0F9FF",
        color: "primary.dark",
        mt: 0.25,
      }}
    >
      {icon}
    </Box>
    <Box sx={{ flex: 1, minWidth: 0 }}>
      <Typography
        variant="caption"
        sx={{ display: "block", color: "text.secondary", fontWeight: 700, letterSpacing: 0.4, textTransform: "uppercase", fontSize: 11, mb: 0.4 }}
      >
        {label}
      </Typography>
      {editable && isEditing ? (
        <TextField
          size="small"
          fullWidth
          variant="standard"
          type={type}
          value={inputValue ?? ""}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          slotProps={{
            htmlInput: maxLength ? { maxLength } : undefined,
          }}
        />
      ) : (
        <Typography variant="body2" sx={{ fontWeight: 700, wordBreak: "break-word" }}>
          {value}
        </Typography>
      )}
    </Box>
  </Box>
);

const StatRow = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <Box sx={{ py: 1.1 }}>
    <Typography
      variant="caption"
      sx={{
        display: "block",
        color: "text.secondary",
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: "uppercase",
        fontSize: 11,
        mb: 0.3,
      }}
    >
      {label}
    </Typography>
    <Typography sx={{ fontWeight: 700, fontSize: 14.5, color: "text.primary" }}>{value}</Typography>
  </Box>
);

interface TabPanelProps {
  active: boolean;
  children: React.ReactNode;
}
const TabPanel = ({ active, children }: TabPanelProps) => {
  if (!active) return null;
  return <Box>{children}</Box>;
};

const PLAN_ICON_COLORS: Record<PublicPlan["icon"], string> = {
  magic: "#A855F7",
  bolt: "#F59E0B",
  users: "#6366F1",
  building: "#0F766E",
};

const planIconFor = (icon: PublicPlan["icon"]) => {
  switch (icon) {
    case "magic":
      return <MagicIcon fontSize="small" />;
    case "bolt":
      return <BoltIcon fontSize="small" />;
    case "users":
      return <UsersGroupIcon fontSize="small" />;
    case "building":
      return <BuildingIcon fontSize="small" />;
    default:
      return <BoltIcon fontSize="small" />;
  }
};

const MyProfile: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", email: "", mobile: "" });
  const [originalForm, setOriginalForm] = useState({ firstName: "", lastName: "", email: "", mobile: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  const hasProfileChanges =
    editForm.firstName !== originalForm.firstName ||
    editForm.lastName !== originalForm.lastName ||
    editForm.email !== originalForm.email ||
    editForm.mobile !== originalForm.mobile;
  const [toast, setToast] = useState<{ message: string; type: ToastType } | null>(null);

  const [activeTab, setActiveTab] = useState<"credentials" | "security" | "plan">("credentials");

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const avatarStorageKey = profile ? `profile_avatar_${profile.username}` : null;

  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getOrgProfile();
      const data: ProfileData = response?.data ?? response;
      setProfile(data);
      try {
        const stored = localStorage.getItem(`profile_avatar_${data.username}`);
        setAvatarPreview(stored);
      } catch {
      }
    } catch (err) {
      console.error("Failed to load profile:", err);
      setError("Unable to load your profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarError(null);

    if (!file.type.startsWith("image/")) {
      setAvatarError("Please choose an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Image must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      if (avatarStorageKey) {
        try {
          localStorage.setItem(avatarStorageKey, dataUrl);
        } catch {
        }
      }
    };
    reader.onerror = () => setAvatarError("Couldn't read that image. Try another file.");
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarPreview(null);
    setAvatarError(null);
    if (avatarStorageKey) {
      try {
        localStorage.removeItem(avatarStorageKey);
      } catch {
      }
    }
  };

  const startEditing = () => {
    if (!profile) return;
    const { first, last } = splitName(profile.name);
    const initial = {
      firstName: first === "—" ? "" : first,
      lastName: last === "—" ? "" : last,
      email: profile.email ?? "",
      mobile: profile.mobile ?? "",
    };
    setEditForm(initial);
    setOriginalForm(initial);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    const firstNameError = validateNameField(editForm.firstName, "First name");
    const lastNameError = validateNameField(editForm.lastName, "Last name");
    const emailError = validateEmail(editForm.email, "Email");
    const mobileError = validateMobile(editForm.mobile, "Phone number");
    const firstIssue = firstNameError || lastNameError || emailError || mobileError;
    if (firstIssue) {
      setToast({ type: "error", message: firstIssue });
      return;
    }

    setSavingProfile(true);
    try {
      const payload = {
        name: `${editForm.firstName.trim()} ${editForm.lastName.trim()}`.trim(),
        email: editForm.email.trim(),
        mobile: editForm.mobile.trim(),
      };
      await updateOrgProfile(payload);
      await loadProfile();
      setIsEditing(false);
      setToast({ type: "success", message: "Profile updated." });
    } catch (err: any) {
      console.error("Failed to update profile:", err);
      setToast({
        type: "error",
        message: err?.response?.data?.message ?? "Unable to update profile. Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  };
  const goToChangePassword = () => {
    navigate(location.pathname.replace(/\/profile$/, "/change-password"));
  };

  const isActive = profile?.status?.toLowerCase() === "active";
  const { first, last } = splitName(profile?.name);
  const isSuperAdmin = profile?.role?.toLowerCase() === "super_admin";
  const isOrgAdmin = profile?.role?.toLowerCase() === "org_admin";
  const { status: subscription, refetch: refetchSubscription } = useSubscriptionStatus();
  const planLabel = subscription
    ? `${subscription.plan_name}${subscription.billing_cycle ? ` (${formatLabel(subscription.billing_cycle)})` : ""}`
    : "—";
  const showPlan = isOrgAdmin;
  useEffect(() => {
    if (!showPlan && activeTab === "plan") {
      setActiveTab("credentials");
    }
  }, [showPlan, activeTab]);
  const [plans, setPlans] = useState<PublicPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [plansReloadKey, setPlansReloadKey] = useState(0);

  useEffect(() => {
    if (!showPlan) return;
    let cancelled = false;

    const TIMEOUT_MS = 15000;
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("timeout")), TIMEOUT_MS);
    });

    (async () => {
      try {
        setPlansLoading(true);
        setPlansError(null);
        const response: any = await Promise.race([getPublicPlans(), timeoutPromise]);
        const list: PublicPlan[] = Array.isArray(response)
          ? response
          : Array.isArray(response?.data)
          ? response.data
          : Array.isArray(response?.results)
          ? response.results
          : [];
        if (!cancelled) setPlans(list);
      } catch (err) {
        console.error("Failed to load plans:", err);
        if (!cancelled) {
          setPlansError("Unable to load plans. Please check your connection and try again.");
        }
      } finally {
        if (!cancelled) setPlansLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plansReloadKey, showPlan]);

  const displayPlans = plans.filter((p) => p.badge !== "free_trial").slice(0, 3);
  const currentPlanName = showPlan ? subscription?.plan_name?.trim().toLowerCase() : undefined;
  const [switchDialogOpen, setSwitchDialogOpen] = useState(false);
  const [switchPlanTarget, setSwitchPlanTarget] = useState<PublicPlan | null>(null);

  const openSwitchPlan = (plan: PublicPlan) => {
    setSwitchPlanTarget(plan);
    setSwitchDialogOpen(true);
  };

  const planStatusMeta = subscription ? PLAN_STATUS_META[subscription.subscription_status] : undefined;

  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
        <Stack direction="row" spacing={2} sx={{ alignItems: "center", flexWrap: "wrap", mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundImage: brandGradient,
              flexShrink: 0,
            }}
          >
            <UserIcon sx={{ color: "#fff" }} />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
              Account Center
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Manage your profile, credentials and account security
            </Typography>
          </Box>
        </Stack>

        {loading && <Typography color="text.secondary">Loading profile…</Typography>}

        {!loading && error && (
          <Paper variant="outlined" sx={{ p: 4, borderRadius: 3, textAlign: "center" }}>
            <Typography color="error.main" sx={{ mb: 1.5 }}>
              {error}
            </Typography>
            <Button variant="outlined" onClick={loadProfile}>
              Retry
            </Button>
          </Paper>
        )}

        {!loading && !error && profile && (
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2.5, alignItems: "flex-start" }}>
            {/* ---------------- Left: profile hero card ---------------- */}
            <Paper
              variant="outlined"
              sx={{
                flex: "1 1 320px",
                maxWidth: { xs: "100%", sm: 320 },
                borderRadius: 4,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* gradient banner */}
              <Box
                sx={{
                  position: "relative",
                  height: 96,
                  backgroundImage: brandGradient,
                  display: "flex",
                  alignItems: "flex-start",
                  justifyContent: "flex-end",
                  p: 1.5,
                }}
              >
                <Chip
                  size="small"
                  label={isActive ? "ACTIVE" : "INACTIVE"}
                  sx={{
                    bgcolor: "rgba(255,255,255,0.22)",
                    color: "#fff",
                    fontWeight: 700,
                    fontSize: 11,
                    letterSpacing: 0.5,
                    backdropFilter: "blur(2px)",
                  }}
                />
              </Box>

              <Box sx={{ px: 3.5, pb: 3.5, pt: 0, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flex: 1 }}>
                <Box sx={{ position: "relative", mt: "-40px", mb: 2 }}>
                  <Avatar
                    src={avatarPreview ?? undefined}
                    sx={{
                      width: 84,
                      height: 84,
                      fontSize: 28,
                      fontWeight: 700,
                      color: "#fff",
                      backgroundImage: avatarPreview ? "none" : brandGradient,
                      border: "4px solid",
                      borderColor: "background.paper",
                      boxShadow: "0 8px 20px rgba(37,99,235,0.28)",
                    }}
                  >
                    {!avatarPreview && initialsOf(profile.name)}
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={handleAvatarChange}
                  />
                  <IconButton
                    size="small"
                    title="Upload photo"
                    aria-label="Upload profile photo"
                    onClick={handleAvatarClick}
                    sx={{
                      position: "absolute",
                      bottom: -2,
                      right: -2,
                      width: 26,
                      height: 26,
                      bgcolor: "background.paper",
                      border: "1px solid",
                      borderColor: "divider",
                      "&:hover": { bgcolor: "background.paper" },
                    }}
                  >
                    <CameraIcon sx={{ fontSize: 13 }} />
                  </IconButton>

                  {avatarPreview && (
                    <IconButton
                      size="small"
                      title="Remove photo"
                      aria-label="Remove profile photo"
                      onClick={handleRemoveAvatar}
                      sx={{
                        position: "absolute",
                        bottom: -2,
                        left: -2,
                        width: 26,
                        height: 26,
                        bgcolor: "background.paper",
                        border: "1px solid",
                        borderColor: "divider",
                        color: "error.main",
                        "&:hover": { bgcolor: "error.light" },
                      }}
                    >
                      <DeleteIcon sx={{ fontSize: 13 }} />
                    </IconButton>
                  )}
                </Box>

                {avatarError && (
                  <Typography variant="caption" color="error.main" sx={{ mb: 1.5, display: "block" }}>
                    {avatarError}
                  </Typography>
                )}

                <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", justifyContent: "center" }}>
                  <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                    {profile.name}
                  </Typography>
                  {isActive && <VerifiedIcon sx={{ fontSize: 18, color: "primary.main" }} />}
                </Stack>

                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                  {profile.username}
                </Typography>

                <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", justifyContent: "center", mb: 2.5 }}>
                  <Chip
                    size="small"
                    label={formatLabel(profile.role)}
                    sx={{ fontWeight: 700, bgcolor: "#F0F9FF", color: "primary.dark" }}
                  />
                  <Chip
                    size="small"
                    label={isActive ? "Active account" : "Inactive account"}
                    sx={{
                      fontWeight: 700,
                      bgcolor: isActive ? "success.light" : "error.light",
                      color: isActive ? "success.main" : "error.main",
                    }}
                  />
                </Stack>

                <Divider sx={{ width: "100%", mb: 1 }} />

                <Box sx={{ width: "100%" }}>
                  {!isSuperAdmin && (
                    <StatRow label="Organization" value={profile.organization || "—"} />
                  )}
                  {showPlan && <StatRow label="Plan" value={planLabel} />}
                  <StatRow label="Status" value={formatLabel(profile.status)} />
                  <StatRow label="Member since" value={formatDate(profile.created_on)} />
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<EditIcon fontSize="small" />}
                  onClick={() => {
                    setActiveTab("credentials");
                    startEditing();
                  }}
                  sx={{ mt: 2.5 }}
                >
                  Edit profile
                </Button>
              </Box>
            </Paper>

            {/* ---------------- Right: tabbed account panel ---------------- */}
            <Paper variant="outlined" sx={{ flex: "3 1 480px", minWidth: 0, borderRadius: 4, overflow: "hidden" }}>
              <Tabs
                value={activeTab}
                onChange={(_, v) => setActiveTab(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{
                  px: 2,
                  borderBottom: "1px solid",
                  borderColor: "divider",
                  minHeight: 52,
                  "& .MuiTab-root": { minHeight: 52, fontWeight: 700, fontSize: 13.5 },
                }}
              >
                <Tab
                  value="credentials"
                  label="Credentials"
                  icon={<CredentialsTabIcon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                />
                <Tab
                  value="security"
                  label="Security"
                  icon={<SecurityTabIcon sx={{ fontSize: 18 }} />}
                  iconPosition="start"
                />
                {showPlan && (
                  <Tab
                    value="plan"
                    label="Plan"
                    icon={<PlanIcon sx={{ fontSize: 18 }} />}
                    iconPosition="start"
                  />
                )}
              </Tabs>

              <Box sx={{ p: { xs: 2.5, md: 3.5 } }}>
                {/* ---------------- Credentials tab ---------------- */}
                <TabPanel active={activeTab === "credentials"}>
                  <Stack
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1.5}
                    sx={{
                      justifyContent: "space-between",
                      alignItems: { xs: "flex-start", sm: "center" },
                      mb: 2.5,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                        Account overview
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Primary identifier variables associated with your profile
                      </Typography>
                    </Box>
                    {isEditing && (
                      <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="inherit"
                          startIcon={<CloseIcon sx={{ fontSize: 15 }} />}
                          onClick={cancelEditing}
                          disabled={savingProfile}
                        >
                          Cancel
                        </Button>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<CheckIcon sx={{ fontSize: 15 }} />}
                          onClick={handleSaveProfile}
                          disabled={savingProfile || !hasProfileChanges}
                          sx={{ color: "#fff" }}
                        >
                          {savingProfile ? "Saving…" : "Save"}
                        </Button>
                      </Stack>
                    )}
                  </Stack>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 2,
                      mb: 2,
                    }}
                  >
                    <CredentialBox
                      icon={<BadgeIcon sx={{ fontSize: 17 }} />}
                      label="First name"
                      value={first}
                      editable
                      isEditing={isEditing}
                      inputValue={editForm.firstName}
                      onChange={(v) => setEditForm({ ...editForm, firstName: v })}
                      placeholder="Enter your first name"
                    />
                    <CredentialBox
                      icon={<BadgeIcon sx={{ fontSize: 17 }} />}
                      label="Last name"
                      value={last}
                      editable
                      isEditing={isEditing}
                      inputValue={editForm.lastName}
                      onChange={(v) => setEditForm({ ...editForm, lastName: v })}
                      placeholder="Enter your last name"
                    />
                  </Box>

                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 2,
                      mb: 3,
                    }}
                  >
                    <CredentialBox
                      icon={<EmailIcon sx={{ fontSize: 17 }} />}
                      label="Email address"
                      value={profile.email}
                      editable
                      isEditing={isEditing}
                      inputValue={editForm.email}
                      onChange={(v) => setEditForm({ ...editForm, email: v })}
                      placeholder="Enter your email"
                      type="email"
                    />
                    <CredentialBox
                      icon={<UserIcon sx={{ fontSize: 17 }} />}
                      label="Username"
                      value={profile.username}
                    />
                    <CredentialBox
                      icon={<PhoneIcon sx={{ fontSize: 17 }} />}
                      label="Phone number"
                      value={profile.mobile || "—"}
                      editable
                      isEditing={isEditing}
                      inputValue={editForm.mobile}
                      onChange={(v) => setEditForm({ ...editForm, mobile: sanitizeMobileInput(v) })}
                      placeholder="Enter your mobile number"
                      maxLength={10}
                    />
                  </Box>

                  <Divider sx={{ mb: 3 }} />

                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                    Professional information
                  </Typography>
                  <Box
                    sx={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 2,
                    }}
                  >
                    <CredentialBox
                      icon={<ShieldIcon sx={{ fontSize: 17 }} />}
                      label="Role"
                      value={formatLabel(profile.role)}
                    />
                    {!isSuperAdmin && (
                      <CredentialBox
                        icon={<BuildingIcon sx={{ fontSize: 17 }} />}
                        label="Organization"
                        value={profile.organization || "—"}
                      />
                    )}
                    {showPlan && (
                      <CredentialBox
                        icon={<PlanIcon sx={{ fontSize: 17 }} />}
                        label="Plan"
                        value={planLabel}
                      />
                    )}
                    <CredentialBox
                      icon={<CalendarIcon sx={{ fontSize: 17 }} />}
                      label="Member since"
                      value={formatDate(profile.created_on)}
                    />
                    <CredentialBox
                      icon={<ClockIcon sx={{ fontSize: 17 }} />}
                      label="Last updated"
                      value={`${formatDate(profile.updated_on)}${profile.updated_by ? ` · by ${profile.updated_by}` : ""}`}
                    />
                  </Box>

                  {/* ---------------- Registration details (org admin only) ---------------- */}
                  {isOrgAdmin && (
                    <>
                      <Divider sx={{ my: 3 }} />

                      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>
                        Registration details
                      </Typography>
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 2,
                          mb: 2,
                        }}
                      >
                        <CredentialBox
                          icon={<LocationIcon sx={{ fontSize: 17 }} />}
                          label="Address"
                          value={formatFullAddress(profile)}
                        />
                        <CredentialBox
                          icon={<LocationIcon sx={{ fontSize: 17 }} />}
                          label="City"
                          value={profile.city || "—"}
                        />
                        <CredentialBox
                          icon={<LocationIcon sx={{ fontSize: 17 }} />}
                          label="State"
                          value={profile.state || "—"}
                        />
                        <CredentialBox
                          icon={<LocationIcon sx={{ fontSize: 17 }} />}
                          label="Pincode"
                          value={profile.pincode || "—"}
                        />
                        <CredentialBox
                          icon={<CountryIcon sx={{ fontSize: 17 }} />}
                          label="Country"
                          value={profile.country || "—"}
                        />
                      </Box>

                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                          gap: 2,
                        }}
                      >
                        <CredentialBox
                          icon={<PanIcon sx={{ fontSize: 17 }} />}
                          label="PAN number"
                          value={profile.pan_number || "—"}
                        />
                        <CredentialBox
                          icon={<GstIcon sx={{ fontSize: 17 }} />}
                          label="GST number"
                          value={profile.gst_number || "Not GST-registered"}
                        />
                      </Box>
                    </>
                  )}
                </TabPanel>

                {/* ---------------- Security tab ---------------- */}
                <TabPanel active={activeTab === "security"}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                    Account security
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
                    Keep your account secure by using a strong, unique password
                  </Typography>

                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      p: 2.5,
                      borderRadius: 3,
                      border: "1px solid",
                      borderColor: "divider",
                      flexWrap: "wrap",
                    }}
                  >
                    <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: "10px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundImage: brandGradient,
                        }}
                      >
                        <KeyIcon sx={{ color: "#fff", fontSize: 19 }} />
                      </Box>
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          Password
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Update your password to keep your account safe
                        </Typography>
                      </Box>
                    </Stack>
                    <Button
                      variant="outlined"
                      endIcon={<ChevronRightIcon fontSize="small" />}
                      onClick={goToChangePassword}
                    >
                      Change password
                    </Button>
                  </Box>
                </TabPanel>

                {showPlan && (
                  <TabPanel active={activeTab === "plan"}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 2,
                        mb: 2.5,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 0.5 }}>
                          Your plan
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {subscription
                            ? `You're currently on the ${subscription.plan_name} plan.`
                            : "Compare available plans for your organization."}
                        </Typography>
                      </Box>

                      {planStatusMeta && (
                        <Chip
                          label={planStatusMeta.label}
                          color={planStatusMeta.color === "default" ? undefined : planStatusMeta.color}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            flexShrink: 0,
                            ...(planStatusMeta.color === "default" && {
                              bgcolor: "action.selected",
                              color: "text.secondary",
                            }),
                          }}
                        />
                      )}
                    </Box>

                    {plansLoading && (
                      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                        Loading plans…
                      </Typography>
                    )}

                    {!plansLoading && plansError && (
                      <Box sx={{ py: 4, textAlign: "center" }}>
                        <Typography color="error.main" sx={{ mb: 1.5 }}>
                          {plansError}
                        </Typography>
                        <Button variant="outlined" onClick={() => setPlansReloadKey((k) => k + 1)}>
                          Retry
                        </Button>
                      </Box>
                    )}

                    {!plansLoading && !plansError && displayPlans.length === 0 && (
                      <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                        No plans are available right now.
                      </Typography>
                    )}

                    {!plansLoading && !plansError && displayPlans.length > 0 && (
                      <Box
                        sx={{
                          display: "grid",
                          gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                          gap: 2,
                          alignItems: "stretch",
                        }}
                      >
                        {displayPlans.map((plan) => {
                          const isCurrent = currentPlanName === plan.plan_name.trim().toLowerCase();
                          const iconColor = PLAN_ICON_COLORS[plan.icon] ?? "#64748B";

                          return (
                            <Card
                              key={plan.id}
                              elevation={0}
                              variant="outlined"
                              sx={{
                                position: "relative",
                                p: 2.25,
                                pt: isCurrent ? 4 : plan.badge === "popular" ? 3.75 : 2.25,
                                borderRadius: 3,
                                display: "flex",
                                flexDirection: "column",
                                borderColor: isCurrent
                                  ? "primary.main"
                                  : plan.badge === "popular"
                                  ? "primary.light"
                                  : "divider",
                                borderWidth: isCurrent ? 2.5 : 1,
                                bgcolor: isCurrent ? alpha("#2563EB", 0.045) : "background.paper",
                                boxShadow: isCurrent
                                  ? "0 12px 28px rgba(37,99,235,0.22)"
                                  : plan.badge === "popular"
                                  ? "0 8px 20px rgba(14,60,97,0.1)"
                                  : "none",
                                transform: isCurrent ? { md: "scale(1.02)" } : "none",
                                transition: "box-shadow 150ms ease, border-color 150ms ease, transform 150ms ease",
                              }}
                            >
                              {isCurrent ? (
                                <Chip
                                  icon={<CurrentPlanIcon sx={{ fontSize: 13 }} />}
                                  label="CURRENT PLAN"
                                  size="small"
                                  color="primary"
                                  sx={{
                                    position: "absolute",
                                    top: 12,
                                    left: 12,
                                    fontWeight: 700,
                                    fontSize: 10,
                                    height: 22,
                                    color: "#fff",
                                  }}
                                />
                              ) : plan.badge === "popular" ? (
                                <Chip
                                  icon={<StarIcon sx={{ fontSize: 12 }} />}
                                  label="POPULAR"
                                  size="small"
                                  sx={{ position: "absolute", top: 12, left: 12, fontWeight: 700, fontSize: 10, height: 22 }}
                                />
                              ) : null}

                              <Box
                                sx={{
                                  width: 34,
                                  height: 34,
                                  borderRadius: 1.5,
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  bgcolor: alpha(iconColor, 0.12),
                                  color: iconColor,
                                  mb: 1,
                                  "& svg": { fontSize: 17 },
                                }}
                              >
                                {planIconFor(plan.icon)}
                              </Box>

                              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                                {plan.plan_name}
                              </Typography>
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ mb: 1.5, minHeight: 32, display: "block", lineHeight: 1.4 }}
                              >
                                {plan.description}
                              </Typography>

                              <Box sx={{ display: "flex", alignItems: "baseline", gap: 0.5, mb: 1.5 }}>
                                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                                  {plan.monthly_price === 0 ? "Free" : `₹${plan.monthly_price.toLocaleString("en-IN")}`}
                                </Typography>
                                {plan.monthly_price > 0 && (
                                  <Typography variant="caption" color="text.secondary">
                                    / month
                                  </Typography>
                                )}
                              </Box>

                              <Box
                                sx={{
                                  display: "flex",
                                  justifyContent: "space-between",
                                  bgcolor: "background.default",
                                  borderRadius: 1.5,
                                  p: 1.25,
                                  mb: 1.5,
                                }}
                              >
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 10 }}>
                                    Employees
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {plan.employee_limit == null ? "Unlimited" : `Up to ${plan.employee_limit}`}
                                  </Typography>
                                </Box>
                                <Box>
                                  <Typography variant="caption" color="text.secondary" sx={{ display: "block", fontSize: 10 }}>
                                    Queues
                                  </Typography>
                                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                    {plan.queue_limit == null ? "Unlimited" : `Up to ${plan.queue_limit}`}
                                  </Typography>
                                </Box>
                              </Box>

                              <Box
                                component="ul"
                                sx={{ listStyle: "none", p: 0, m: 0, mb: 1.5, flex: 1, display: "flex", flexDirection: "column" }}
                              >
                                {plan.features.map((f, idx) => (
                                  <Box
                                    component="li"
                                    key={idx}
                                    sx={{
                                      display: "flex",
                                      alignItems: "flex-start",
                                      gap: 0.75,
                                      py: 0.3,
                                      color: f.included ? "text.primary" : "text.disabled",
                                    }}
                                  >
                                    {f.included ? (
                                      <CheckIcon sx={{ fontSize: 13, mt: "1px" }} color="success" />
                                    ) : (
                                      <CloseIcon sx={{ fontSize: 13, mt: "1px", color: "rgba(220,38,38,0.55)" }} />
                                    )}
                                    <Typography variant="caption" sx={{ lineHeight: 1.4 }}>
                                      {f.label}
                                    </Typography>
                                  </Box>
                                ))}
                              </Box>

                              <Divider sx={{ mb: 1.5 }} />

                              <Button
                                fullWidth
                                size="small"
                                variant={isCurrent ? "contained" : "outlined"}
                                disabled={isCurrent}
                                onClick={() => openSwitchPlan(plan)}
                                sx={{ color: isCurrent ? "#fff" : undefined }}
                              >
                                {isCurrent ? "Active plan" : "Switch to this plan"}
                              </Button>
                            </Card>
                          );
                        })}
                      </Box>
                    )}
                  </TabPanel>
                )}
              </Box>
            </Paper>
          </Box>
        )}

        {showPlan && (
          <RenewPlanDialog
            open={switchDialogOpen}
            onClose={() => setSwitchDialogOpen(false)}
            organizationName={profile?.organization || ""}
            initialPlan={switchPlanTarget}
            title="Switch your plan"
            subtitle="Choose a billing cycle to switch to this plan."
            confirmLabel="Switch Plan"
            onRenewed={() => {
              refetchSubscription();
              setSwitchDialogOpen(false);
            }}
          />
        )}
      </Box>
    </ThemeProvider>
  );
};

export default MyProfile;