import { submitContactMessage } from "../services/api";
import { validateContactForm } from "./contactvalidation";

import React, { useEffect, useState } from "react";
import {
  Alert,
  AppBar,
  Box,
  Button,
  Chip,
  Container,
  CssBaseline,
  Divider,
  Drawer,
  Grid,
  IconButton,
  Paper,
  Snackbar,
  Stack,
  TextField,
  ThemeProvider,
  Toolbar,
  Tooltip,
  Typography,
  createTheme,
  useMediaQuery,
} from "@mui/material";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Building2,
  CalendarCheck,
  Check,
  CheckCircle2,
  Clock3,
  Globe,
  Headphones,
  Hospital,
  LayoutDashboard,
  Lock,
  Mail,
  MapPin,
  Menu,
  MessageSquare,
  Monitor,
  Moon,
  MoreHorizontal,
  Phone,
  RotateCcw,
  Send,
  Shield,
  ShieldCheck,
  Sparkles,
  Star,
  Store,
  Stethoscope,
  Sun,
  Ticket,
  UserCheck,
  Users,
  X,
  Zap,
} from "lucide-react";

/* =============================================================================
   DESIGN TOKENS

   The product is an operations console for appointment booking and live
   queues, so the visual language borrows from ticket counters and dispatch
   boards: warm amber for the "now serving" accent, monospace for numerals
   that behave like ticket/queue numbers, and a quiet structural palette
   everywhere else. The light theme now sits on a sky-blue base per request,
   with light hairline borders separating every section.
============================================================================= */

function getTokens(darkMode: boolean) {
  return darkMode
    ? {
      page: "#0B0E12",
      surface: "#12161C",
      surfaceAlt: "#171C23",
      ink: "#F1F1EC",
      inkMuted: "#9AA3AC",
      line: "rgba(255,255,255,0.09)",
      accent: "#4C93F8",
      accentSoft: "rgba(76,147,248,0.14)",
      accentInk: "#0F1826",
      success: "#59C58A",
      successSoft: "rgba(89,197,138,0.14)",
      danger: "#FF6B6B",
    }
    : {
      page: "#EAF6FE",
      surface: "#FFFFFF",
      surfaceAlt: "#DAEFFB",
      ink: "#14181D",
      inkMuted: "#5B6570",
      line: "#BFE0F2",
      accent: "#2F80ED",
      accentSoft: "#DFEBFD",
      accentInk: "#1B2A41",
      success: "#2F6B48",
      successSoft: "#E3F0E6",
      danger: "#D64545",
    };
}

const fontDisplay = "'Space Grotesk', 'IBM Plex Sans', sans-serif";
const fontBody = "'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif";
const fontMono = "'IBM Plex Mono', ui-monospace, monospace";

const theme = createTheme({
  palette: { mode: "light" },
  typography: {
    fontFamily: fontBody,
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
      `,
    },
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, minHeight: 44, paddingLeft: 22, paddingRight: 22 },
      },
    },
    MuiTextField: { defaultProps: { size: "small" } },
  },
});

/* =============================================================================
   CONTENT — same information as the product; only the presentation changes.
============================================================================= */

const industries = [
  {
    title: "Hospitals",
    description: "Manage departments, appointments, patient queues and service counters.",
    icon: Hospital,
    color: "#EF476F",
  },
  {
    title: "Clinics",
    description: "Optimize doctor appointments, walk-ins and patient waiting time.",
    icon: Stethoscope,
    color: "#1CBE9B",
  },
  {
    title: "Banks",
    description: "Manage branch queues, service desks and customer operations.",
    icon: Building2,
    color: "#5B63D3",
  },
  {
    title: "Retail Stores",
    description: "Improve checkout queues and customer service counter efficiency.",
    icon: Store,
    color: "#F5A524",
  },
  {
    title: "Customer Support",
    description: "Optimize support queues, agents and service performance.",
    icon: Headphones,
    color: "#9B51E0",
  },
];

const features = [
  {
    title: "Appointment Booking",
    description: "Smart slot allocation, appointment management and conflict prevention.",
    icon: CalendarCheck,
  },
  {
    title: "Queue Management",
    description: "Manage live tokens, transfers, pause/resume and real-time queue updates.",
    icon: Ticket,
  },
  {
    title: "Employee Management",
    description: "Manage employees, shifts, designations, performance and workload.",
    icon: Users,
  },
  {
    title: "Customer Management",
    description: "Maintain customer profiles, service history, preferences and feedback.",
    icon: UserCheck,
  },
  {
    title: "Analytics Dashboard",
    description: "Understand waiting-time trends, peak hours and operational bottlenecks.",
    icon: BarChart3,
  },
  {
    title: "Reports",
    description: "Generate daily, monthly and annual reports with export capabilities.",
    icon: LayoutDashboard,
  },
  {
    title: "Notifications",
    description: "Keep customers and employees informed with timely notifications.",
    icon: MessageSquare,
  },
  {
    title: "Feedback Management",
    description: "Collect ratings and feedback to improve service quality.",
    icon: Activity,
  },
  {
    title: "Role-Based Access",
    description: "Control access for Super Admin, Organization Admin, Employee and Customer.",
    icon: ShieldCheck,
  },
];

const workflow = [
  {
    number: "01",
    title: "Organization Registers",
    description: "Sign up with organization details, category and contact information.",
  },
  {
    number: "02",
    title: "Super Admin Approval",
    description: "Platform team reviews and approves the organization request.",
  },
  { number: "03", title: "Organization Setup", description: "Configure services, employees, shifts and customers." },
  { number: "04", title: "Customer Booking", description: "Customers book appointments or join the queue." },
  {
    number: "05",
    title: "Queue Processing",
    description: "Employees manage live tokens, transfers and service updates.",
  },
  {
    number: "06",
    title: "Analytics & Reporting",
    description: "Optimize operations using analytics, reports and recommendations.",
  },
];

const securityFeatures = [
  {
    title: "JWT Authentication",
    description: "Secure authentication with access and refresh-token architecture.",
    icon: Lock,
  },
  {
    title: "Role-Based Access",
    description: "Strict role-based permissions across the application.",
    icon: ShieldCheck,
  },
  { title: "Audit Logging", description: "Track important create, update and delete activities.", icon: Activity },
  { title: "Data Protection", description: "Protect application data in transit and at rest.", icon: Lock },
  { title: "Session Management", description: "Manage sessions, timeouts and secure logout.", icon: RotateCcw },
  {
    title: "Activity Monitoring",
    description: "Monitor important activity and suspicious access patterns.",
    icon: Monitor,
  },
];

const pricingPlans = [
  {
    name: "Free Trial",
    price: "₹0.00",
    period: "/ month",
    description: "Basic features for trying IndusServiceFlow.",
    employees: "Up to 5",
    queues: "Up to 2",
    button: "Start Free Trial",
    icon: Sparkles,
    iconBg: "#F1ECFE",
    iconColor: "#16A34A",
    accent: "#16A34A",
    badge: { label: "14-Day Free Trial", icon: Sparkles, color: "#16A34A" },
    features: [
      "Appointment booking",
      "Queue management",
      "Employee management",
      "Basic dashboard",
      "Basic simulation",
      "Basic reports",
      "Advanced simulation",
    ],
  },
  {
    name: "Starter",
    price: "₹2,999.00",
    period: "/ month",
    description: "Essential queue management for small organizations.",
    employees: "Up to 15",
    queues: "Up to 5",
    button: "Choose Starter",
    icon: Zap,
    iconBg: "#FEF3E2",
    iconColor: "#2F80ED",
    accent: "#2F80ED",
    features: [
      "Appointment booking",
      "Queue management",
      "Employee management",
      "Basic dashboard",
      "Basic simulation",
      "Basic reports",
      "Advanced simulation",
    ],
  },
  {
    name: "Growth",
    price: "₹5,999.00",
    period: "/ month",
    description: "Advanced queue management and analytics for growing organizations.",
    employees: "Up to 50",
    queues: "Up to 20",
    button: "Choose Growth",
    popular: true,
    icon: Users,
    iconBg: "#EFECFE",
    iconColor: "#06B6D4",
    accent: "#06B6D4",
    badge: { label: "Most Popular", icon: Star, color: "#06B6D4" },
    features: [
      "Appointment booking",
      "Queue management",
      "Employee management",
      "Basic dashboard",
      "Basic simulation",
      "Basic reports",
      "Advanced simulation",
      "Advanced analytics",
      "Excel reports",
      "Queue bottleneck analysis",
      "Staffing analysis",
    ],
  },
  {
    name: "Enterprise",
    price: "₹9,999.00",
    period: "/ month",
    description: "Complete solution for large organizations.",
    employees: "Unlimited",
    queues: "Unlimited",
    button: "Choose Enterprise",
    icon: Building2,
    iconBg: "#E5F5EA",
    iconColor: "#D946EF",
    accent: "#D946EF",
    features: [
      "Appointment booking",
      "Queue management",
      "Employee management",
      "Basic dashboard",
      "Basic simulation",
      "Basic reports",
      "Advanced simulation",
      "Advanced analytics",
      "Excel reports",
      "Queue bottleneck analysis",
      "Staffing analysis",
      "Capacity planning",
      "Unlimited usage",
    ],
  },
];

const heroStats = [
  { value: "1,250+", label: "Organizations served" },
  { value: "8.4M", label: "Appointments managed" },
  { value: "12M+", label: "Customers served" },
  { value: "47%", label: "Average wait reduction" },
];

const navItems = [
  { label: "Industries", id: "solutions" },
  { label: "Platform", id: "platform" },
  { label: "Security", id: "security" },
  { label: "Pricing", id: "pricing" },
  { label: "Contact", id: "contact" },
];

const scrollToSection = (id: string) => {
  const element = document.getElementById(id);
  if (element) element.scrollIntoView({ behavior: "smooth", block: "start" });
};

/* =============================================================================
   SHARED PIECES
============================================================================= */

function SectionHeading({
  eyebrow,
  title,
  description,
  tokens,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  tokens: ReturnType<typeof getTokens>;
  align?: "left" | "center";
}) {
  return (
    <Stack
      spacing={1.35}
      sx={{
        maxWidth: 720,
        mx: align === "center" ? "auto" : 0,
        textAlign: align,
        mb: { xs: 4.5, md: 6 },
        position: "relative",
      }}
    >
      <Box
        sx={{
          display: "inline-flex",
          alignItems: "center",
          gap: 1,
          justifyContent: align === "center" ? "center" : "flex-start",
          width: "100%",
        }}
      >
        <Box
          sx={{
            width: 28,
            height: 3,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${tokens.accent}, #16B7D8)`,
          }}
        />
        <Typography
          sx={{
            fontFamily: fontMono,
            fontSize: 12,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: tokens.accent,
            fontWeight: 700,
          }}
        >
          {eyebrow}
        </Typography>
      </Box>

      <Typography
        component="h2"
        sx={{
          fontFamily: fontDisplay,
          fontWeight: 700,
          letterSpacing: "-0.035em",
          fontSize: { xs: "1.85rem", sm: "2.15rem", md: "2.55rem" },
          lineHeight: 1.14,
          color: tokens.ink,
        }}
      >
        {title}
      </Typography>

      {description && (
        <Typography
          sx={{
            color: tokens.inkMuted,
            fontSize: { xs: 14.5, md: 15.5 },
            lineHeight: 1.75,
            maxWidth: 650,
            mx: align === "center" ? "auto" : 0,
          }}
        >
          {description}
        </Typography>
      )}
    </Stack>
  );
}

function Navbar({
  darkMode,
  setDarkMode,
  tokens,
}: {
  darkMode: boolean;
  setDarkMode: React.Dispatch<React.SetStateAction<boolean>>;
  tokens: ReturnType<typeof getTokens>;
}) {
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleMenuClick = (id: string) => {
    scrollToSection(id);
    setDrawerOpen(false);
  };

  return (
    <>
      <AppBar
        position="fixed"
        elevation={0}
        sx={{
          backgroundColor: darkMode ? "rgba(11,14,18,0.92)" : "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          borderBottom: `1px solid ${tokens.line}`,
          boxShadow: "none",
        }}
      >
        <Container maxWidth="lg">
          <Toolbar disableGutters sx={{ minHeight: 64, justifyContent: "space-between" }}>
            <Box
              onClick={() => scrollToSection("home")}
              sx={{ display: "flex", alignItems: "center", gap: 1.2, cursor: "pointer" }}
            >
              <Box
                component="img"
                src="/indusserviseflow logo.png"
                alt="IndusServiceFlow"
                sx={{ width: 32, height: 32, objectFit: "contain", borderRadius: 1 }}
              />
              <Box>
                <Typography
                  sx={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 15, color: tokens.ink, lineHeight: 1 }}
                >
                  IndusServiceFlow
                </Typography>
                <Typography sx={{ fontFamily: fontMono, color: tokens.inkMuted, fontSize: 10, mt: 0.3 }}>
                  Service operations platform
                </Typography>
              </Box>
            </Box>

            {!isMobile && (
              <Stack direction="row" spacing={0.5} alignItems="center">
                {navItems.map((item) => (
                  <Button
                    key={item.id}
                    onClick={() => scrollToSection(item.id)}
                    sx={{
                      color: tokens.inkMuted,
                      fontSize: 14,
                      px: 1.4,
                      "&:hover": { color: tokens.ink, backgroundColor: "transparent" },
                    }}
                  >
                    {item.label}
                  </Button>
                ))}
              </Stack>
            )}

            <Stack direction="row" spacing={1} alignItems="center">
              <Tooltip title="Toggle theme">
                <IconButton onClick={() => setDarkMode((prev) => !prev)} sx={{ color: tokens.inkMuted }}>
                  {darkMode ? <Sun size={18} /> : <Moon size={18} />}
                </IconButton>
              </Tooltip>
              {!isMobile ? (
                <>
                  <Button onClick={() => (window.location.href = "/login")} sx={{ color: tokens.ink }}>
                    Login
                  </Button>
                  <Button
                    variant="contained"
                    endIcon={<ArrowRight size={16} />}
                    onClick={() => (window.location.href = "/book")}
                    sx={{
                      backgroundColor: tokens.accent,
                      color: "#FFFFFF",
                      "&:hover": { backgroundColor: tokens.accent, opacity: 0.9 },
                    }}
                  >
                    Book appointment
                  </Button>
                </>
              ) : (
                <IconButton onClick={() => setDrawerOpen(true)} sx={{ color: tokens.ink }}>
                  <Menu size={20} />
                </IconButton>
              )}
            </Stack>
          </Toolbar>
        </Container>
      </AppBar>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 280, p: 3, height: "100%", backgroundColor: tokens.page }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography sx={{ fontFamily: fontDisplay, fontWeight: 600, color: tokens.ink }}>
              IndusServiceFlow
            </Typography>
            <IconButton onClick={() => setDrawerOpen(false)} sx={{ color: tokens.ink }}>
              <X size={20} />
            </IconButton>
          </Stack>
          <Stack spacing={0.5}>
            {navItems.map((item) => (
              <Button
                key={item.id}
                fullWidth
                onClick={() => handleMenuClick(item.id)}
                sx={{ justifyContent: "flex-start", color: tokens.ink, py: 1.3 }}
              >
                {item.label}
              </Button>
            ))}
          </Stack>
          <Divider sx={{ my: 2, borderColor: tokens.line }} />
          <Stack spacing={1.2}>
            <Button fullWidth variant="outlined" onClick={() => (window.location.href = "/login")}>
              Login
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => (window.location.href = "/book")}
              sx={{ backgroundColor: tokens.accent, "&:hover": { backgroundColor: tokens.accent, opacity: 0.9 } }}
            >
              Book appointment
            </Button>
          </Stack>
        </Box>
      </Drawer>
    </>
  );
}

function IconBadge({
  icon: Icon,
  tokens,
  size = 44,
}: {
  icon: any;
  tokens: ReturnType<typeof getTokens>;
  size?: number;
}) {
  return (
    <Box
      sx={{
        width: size,
        height: size,
        flexShrink: 0,
        display: "grid",
        placeItems: "center",
        borderRadius: "50%",
        border: `1.5px solid ${tokens.line}`,
        color: tokens.accent,
        backgroundColor: tokens.surface,
      }}
    >
      <Icon size={size * 0.42} strokeWidth={1.9} />
    </Box>
  );
}

/* Small icon-circle used inside the security hub-and-spoke diagram */
function SecurityIconCircle({
  icon: Icon,
  tokens,
}: {
  icon: any;
  tokens: ReturnType<typeof getTokens>;
}) {
  return (
    <Box
      className="security-icon-circle"
      sx={{
        width: 52,
        height: 52,
        flexShrink: 0,
        borderRadius: 2.5,
        display: "grid",
        placeItems: "center",
        background: `linear-gradient(135deg, ${tokens.accent}, #13B7D4)`,
        boxShadow: `0 10px 22px ${tokens.accent}30`,
        transition: "transform 300ms ease, box-shadow 300ms ease",
      }}
    >
      <Icon size={22} color="#fff" strokeWidth={2} />
    </Box>
  );
}

/* =============================================================================
   MAIN PAGE
============================================================================= */

export default function LandingPage() {
  const [darkMode, setDarkMode] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" as "success" | "error" });
  const tokens = getTokens(darkMode);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleContactSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateContactForm(form);
    if (errors.name || errors.email || errors.subject || errors.message) {
      setSnackbar({
        open: true,
        message: errors.name || errors.email || errors.subject || errors.message || "Please correct the form.",
        severity: "error",
      });
      return;
    }
    try {
      await submitContactMessage(form);
      setSnackbar({
        open: true,
        message: "Message sent successfully. Our team will get back to you shortly.",
        severity: "success",
      });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error: any) {
      setSnackbar({
        open: true,
        message:
          error?.response?.data?.message ||
          error?.response?.data?.detail ||
          "Failed to send message. Please try again.",
        severity: "error",
      });
    }
  };

  const inputSx = {
    "& .MuiInputLabel-root": { color: tokens.inkMuted },
    "& .MuiInput-root": { color: tokens.ink, fontFamily: fontBody },
    "& .MuiInput-underline:before": { borderBottomColor: tokens.line },
    "& .MuiInput-underline:hover:before": { borderBottomColor: tokens.accent },
    "& .MuiInput-underline:after": { borderBottomColor: tokens.accent },
  };

  const leftSecurityItems = securityFeatures.slice(0, 3);
  const rightSecurityItems = securityFeatures.slice(3, 6);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ backgroundColor: tokens.page, color: tokens.ink, minHeight: "100vh", fontFamily: fontBody }}>
        <Navbar darkMode={darkMode} setDarkMode={setDarkMode} tokens={tokens} />

        {/* ================================================== HERO ================================================== */}
        <Box
          id="home"
          sx={{ pt: { xs: 14, md: 17 }, pb: { xs: 8, md: 10 }, borderBottom: `1px solid ${tokens.line}` }}
        >
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 6, md: 8 }} alignItems="center">
              <Grid size={{ xs: 12, md: 6 }}>
                <Stack spacing={3}>
                  <Chip
                    label="Appointment &amp; queue operations"
                    sx={{
                      alignSelf: "flex-start",
                      fontFamily: fontMono,
                      fontSize: 12,
                      color: tokens.accent,
                      backgroundColor: tokens.accentSoft,
                      border: `1px solid ${tokens.accent}55`,
                    }}
                  />
                  <Typography
                    component="h1"
                    sx={{
                      fontFamily: fontDisplay,
                      fontWeight: 600,
                      letterSpacing: "-0.02em",
                      fontSize: { xs: "2.1rem", sm: "2.5rem", md: "3rem" },
                      lineHeight: 1.15,
                      color: tokens.ink,
                    }}
                  >
                    Smarter service operations. Shorter waits. Better experiences.
                  </Typography>
                  <Typography sx={{ color: tokens.inkMuted, fontSize: 16.5, lineHeight: 1.75, maxWidth: 480 }}>
                    IndusServiceFlow gives hospitals, banks, clinics and service businesses a single platform to book
                    appointments, run live queues, and see exactly where operations slow down.
                  </Typography>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <Button
                      variant="contained"
                      size="large"
                      endIcon={<ArrowRight size={18} />}
                      onClick={() => (window.location.href = "/register")}
                      sx={{
                        backgroundColor: tokens.accent,
                        color: "#fff",
                        "&:hover": { backgroundColor: tokens.accent, opacity: 0.9 },
                      }}
                    >
                      Start free trial
                    </Button>
                  </Stack>

                  {/* Ticket-board style stat row */}
                  <Stack
                    direction="row"
                    spacing={{ xs: 2.5, sm: 4 }}
                    sx={{ pt: 2, borderTop: `1px solid ${tokens.line}`, flexWrap: "wrap" }}
                  >
                    {heroStats.map((stat) => (
                      <Box key={stat.label} sx={{ pt: 2 }}>
                        <Typography sx={{ fontFamily: fontMono, fontWeight: 600, fontSize: 20, color: tokens.ink }}>
                          {stat.value}
                        </Typography>
                        <Typography sx={{ color: tokens.inkMuted, fontSize: 11.5, maxWidth: 100, lineHeight: 1.4 }}>
                          {stat.label}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 6 }}>
                <Box
                  sx={{
                    border: `1px solid ${tokens.line}`,
                    borderRadius: 3,
                    p: 1.5,
                    backgroundColor: tokens.surface,
                    overflow: "hidden",
                    boxShadow: `0 18px 45px ${tokens.accent}18`,
                    transition: "transform 350ms ease, box-shadow 350ms ease, border-color 350ms ease",
                    "&:hover": {
                      transform: "translateY(-8px) scale(1.012)",
                      boxShadow: `0 28px 70px ${tokens.accent}30`,
                      borderColor: `${tokens.accent}66`,
                    },
                    "&:hover img": {
                      transform: "scale(1.035)",
                    },
                  }}
                >
                  <Stack direction="row" spacing={0.7} sx={{ px: 1, pb: 1.2 }}>
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tokens.line }} />
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tokens.line }} />
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: tokens.line }} />
                  </Stack>
                  <Box
                    component="img"
                    src="/home image.png"
                    alt="IndusServiceFlow operations dashboard"
                    sx={{
                      width: "100%",
                      height: "auto",
                      display: "block",
                      borderRadius: 1.5,
                      transition: "transform 500ms ease",
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* ================================================== INDUSTRIES ================================================== */}
        <Box id="solutions" sx={{ py: { xs: 7, md: 9 }, borderBottom: `1px solid ${tokens.line}` }}>
          <Container maxWidth="lg">
            <SectionHeading
              tokens={tokens}
              eyebrow="Industries"
              title="One platform. Every service environment."
              description="Give every customer a smoother journey with purpose-built workflows for healthcare, banking, retail and support operations."
              align="center"
            />
            <Grid container spacing={2.5}>
              {industries.map((industry) => {
                const Icon = industry.icon;
                return (
                  <Grid key={industry.title} size={{ xs: 12, sm: 6, md: 12 / industries.length }}>
                    <Box
                      sx={{
                        height: "100%",
                        p: 3,
                        border: `1px solid ${tokens.line}`,
                        borderRadius: 3,
                        backgroundColor: tokens.surface,
                        position: "relative",
                        overflow: "hidden",
                        cursor: "pointer",
                        transition: "transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease",
                        "&::after": {
                          content: '""',
                          position: "absolute",
                          inset: 0,
                          background: `linear-gradient(135deg, ${industry.color}12, transparent 60%)`,
                          opacity: 0,
                          transition: "opacity 300ms ease",
                          pointerEvents: "none",
                        },
                        "&:hover": {
                          transform: "translateY(-9px) scale(1.02)",
                          borderColor: `${industry.color}88`,
                          boxShadow: `0 18px 38px ${industry.color}22`,
                        },
                        "&:hover::after": {
                          opacity: 1,
                        },
                        "&:hover .industry-icon": {
                          transform: "scale(1.12) rotate(-6deg)",
                          boxShadow: `0 12px 24px ${industry.color}44`,
                        },
                        "&:hover .industry-learn-more": {
                          opacity: 1,
                          transform: "translateY(0)",
                        },
                      }}
                    >
                      <Stack spacing={1.5}>
                        <Box
                          className="industry-icon"
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            backgroundColor: industry.color,
                            transition: "transform 300ms ease, box-shadow 300ms ease",
                            position: "relative",
                            zIndex: 1,
                          }}
                        >
                          <Icon size={20} color="#fff" strokeWidth={2} />
                        </Box>
                        <Typography sx={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 15.5, color: tokens.ink }}>
                          {industry.title}
                        </Typography>
                        <Typography sx={{ color: tokens.inkMuted, fontSize: 13.5, lineHeight: 1.6 }}>
                          {industry.description}
                        </Typography>
                        <Stack
                          className="industry-learn-more"
                          direction="row"
                          spacing={0.5}
                          alignItems="center"
                          sx={{
                            pt: 0.5,
                            opacity: 0,
                            transform: "translateY(6px)",
                            transition: "opacity 250ms ease, transform 250ms ease",
                            color: industry.color,
                            fontSize: 12.5,
                            fontWeight: 700,
                          }}
                        >
                          <span>Learn more</span>
                          <ArrowRight size={14} />
                        </Stack>
                      </Stack>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Container>
        </Box>

        {/* ================================================== FEATURES ================================================== */}
        <Box
          id="platform"
          sx={{ py: { xs: 7, md: 9 }, backgroundColor: tokens.surfaceAlt, borderBottom: `1px solid ${tokens.line}` }}
        >
          <Container maxWidth="lg">
            <SectionHeading
              tokens={tokens}
              eyebrow="Platform"
              title="The complete toolkit for high-performing service teams"
              description="Connect booking, queue handling, workforce management, customer service and analytics in one operational workspace."
              align="center"
            />
            <Grid
              container
              spacing={{ xs: 0, md: 0 }}
              sx={{ border: `1px solid ${tokens.line}`, borderRadius: 2, overflow: "hidden" }}
            >
              {features.map((feature, i) => {
                const Icon = feature.icon;
                const isLastCol = (i + 1) % 3 === 0;
                return (
                  <Grid
                    key={feature.title}
                    size={{ xs: 12, sm: 6, md: 4 }}
                    sx={{
                      p: 3,
                      display: "flex",
                      gap: 2,
                      borderRight: { md: isLastCol ? "none" : `1px solid ${tokens.line}` },
                      borderTop: i >= 3 ? `1px solid ${tokens.line}` : "none",
                      backgroundColor: tokens.surface,
                      transition: "background-color 250ms ease, transform 250ms ease",
                      "&:hover": {
                        backgroundColor: darkMode ? "#1A212B" : "#F8FCFF",
                        transform: "translateY(-2px)",
                      },
                    }}
                  >
                    <IconBadge icon={Icon} tokens={tokens} size={40} />
                    <Box>
                      <Typography
                        sx={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 15, color: tokens.ink, mb: 0.5 }}
                      >
                        {feature.title}
                      </Typography>
                      <Typography sx={{ color: tokens.inkMuted, fontSize: 13.5, lineHeight: 1.6 }}>
                        {feature.description}
                      </Typography>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Container>
        </Box>

        {/* ================================================== WORKFLOW (interactive timeline) ================================================== */}
        <Box id="workflow" sx={{ py: { xs: 7, md: 9 }, borderBottom: `1px solid ${tokens.line}` }}>
          <Container maxWidth="lg">
            <SectionHeading
              tokens={tokens}
              eyebrow="How it works"
              title="A simple flow from setup to service insights"
              align="center"
            />
            <Box sx={{ position: "relative", maxWidth: 760, mx: "auto" }}>
              <Box
                sx={{
                  position: "absolute",
                  left: 23,
                  top: 8,
                  bottom: 8,
                  width: 2,
                  background: `linear-gradient(180deg, ${tokens.accent}, #16B7D8)`,
                  opacity: 0.22,
                  display: { xs: "none", sm: "block" },
                }}
              />
              <Stack spacing={1}>
                {workflow.map((step) => (
                  <Stack
                    key={step.number}
                    direction="row"
                    spacing={3}
                    alignItems="flex-start"
                    sx={{
                      position: "relative",
                      p: 2.25,
                      borderRadius: 3,
                      border: "1px solid transparent",
                      cursor: "default",
                      transition:
                        "background-color 250ms ease, border-color 250ms ease, transform 250ms ease, box-shadow 250ms ease",
                      "&:hover": {
                        backgroundColor: tokens.surface,
                        borderColor: tokens.line,
                        transform: "translateX(8px)",
                        boxShadow: `0 12px 28px ${tokens.accent}1C`,
                      },
                      "&:hover .workflow-number": {
                        backgroundColor: tokens.accent,
                        color: "#fff",
                        transform: "scale(1.08)",
                      },
                    }}
                  >
                    <Box
                      className="workflow-number"
                      sx={{
                        width: 46,
                        height: 46,
                        flexShrink: 0,
                        borderRadius: "50%",
                        display: "grid",
                        placeItems: "center",
                        backgroundColor: tokens.accentSoft,
                        color: tokens.accent,
                        fontFamily: fontMono,
                        fontWeight: 700,
                        fontSize: 15,
                        border: `1.5px solid ${tokens.accent}55`,
                        transition: "background-color 250ms ease, color 250ms ease, transform 250ms ease",
                        position: "relative",
                        zIndex: 1,
                      }}
                    >
                      {step.number}
                    </Box>
                    <Box sx={{ flex: 1, pt: 0.5 }}>
                      <Typography
                        sx={{ fontFamily: fontDisplay, fontWeight: 600, fontSize: 15.5, color: tokens.ink, mb: 0.4 }}
                      >
                        {step.title}
                      </Typography>
                      <Typography sx={{ color: tokens.inkMuted, fontSize: 14, lineHeight: 1.65 }}>
                        {step.description}
                      </Typography>
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </Box>
          </Container>
        </Box>

        {/* ================================================== SECURITY (hub-and-spoke diagram) ================================================== */}
        <Box
          id="security"
          sx={{
            py: { xs: 7, md: 10 },
            background: darkMode
              ? "linear-gradient(180deg, #0B0E12 0%, #101722 100%)"
              : "linear-gradient(180deg, #F5FAFF 0%, #EAF5FF 100%)",
            borderBottom: `1px solid ${tokens.line}`,
          }}
        >
          <Container maxWidth="lg">
            <SectionHeading
              tokens={tokens}
              eyebrow="Security"
              title="Security designed into every service interaction"
              description="Keep identities, permissions, sessions and operational activity protected with layered controls across the platform."
              align="center"
            />

            <Grid container spacing={{ xs: 5, md: 3 }} alignItems="center" justifyContent="center">
              {/* Left column — text on the outside, icon toward the center */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={{ xs: 3.5, md: 5 }}>
                  {leftSecurityItems.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <Stack
                        key={feature.title}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{
                          cursor: "default",
                          transition: "transform 250ms ease",
                          "&:hover": { transform: "translateX(-4px)" },
                          "&:hover .security-icon-circle": {
                            transform: "scale(1.1)",
                            boxShadow: `0 14px 28px ${tokens.accent}44`,
                          },
                        }}
                      >
                        <Box sx={{ flex: 1, textAlign: { xs: "left", md: "right" } }}>
                          <Typography sx={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, color: tokens.ink, mb: 0.3 }}>
                            {feature.title}
                          </Typography>
                          <Typography sx={{ color: tokens.inkMuted, fontSize: 12.5, lineHeight: 1.55 }}>
                            {feature.description}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: 2,
                            height: 44,
                            flexShrink: 0,
                            display: { xs: "none", md: "block" },
                            background: `linear-gradient(180deg, transparent, ${tokens.accent}88, transparent)`,
                          }}
                        />
                        <SecurityIconCircle icon={Icon} tokens={tokens} />
                      </Stack>
                    );
                  })}
                </Stack>
              </Grid>

              {/* Center hub */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Box sx={{ display: "grid", placeItems: "center", py: { xs: 2, md: 0 } }}>
                  <Box
                    sx={{
                      width: 190,
                      height: 190,
                      borderRadius: "50%",
                      border: `1.5px dashed ${tokens.accent}55`,
                      display: "grid",
                      placeItems: "center",
                      position: "relative",
                      "@keyframes pulseRing": {
                        "0%": { boxShadow: `0 0 0 0 ${tokens.accent}33` },
                        "70%": { boxShadow: `0 0 0 18px rgba(0,0,0,0)` },
                        "100%": { boxShadow: `0 0 0 0 rgba(0,0,0,0)` },
                      },
                    }}
                  >
                    <Box
                      sx={{
                        position: "absolute",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: tokens.accent,
                        top: 6,
                        left: "50%",
                        transform: "translateX(-50%)",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        backgroundColor: tokens.accent,
                        bottom: 6,
                        left: "50%",
                        transform: "translateX(-50%)",
                      }}
                    />
                    <Box
                      sx={{
                        width: 118,
                        height: 118,
                        borderRadius: "50%",
                        backgroundColor: tokens.surface,
                        boxShadow: `0 16px 40px ${tokens.accent}33`,
                        display: "grid",
                        placeItems: "center",
                        animation: "pulseRing 2.4s ease-out infinite",
                      }}
                    >
                      <ShieldCheck size={50} color={tokens.accent} strokeWidth={1.8} />
                    </Box>
                  </Box>
                </Box>
              </Grid>

              {/* Right column — icon toward the center, text on the outside */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack spacing={{ xs: 3.5, md: 5 }}>
                  {rightSecurityItems.map((feature) => {
                    const Icon = feature.icon;
                    return (
                      <Stack
                        key={feature.title}
                        direction="row"
                        spacing={2}
                        alignItems="center"
                        sx={{
                          cursor: "default",
                          transition: "transform 250ms ease",
                          "&:hover": { transform: "translateX(4px)" },
                          "&:hover .security-icon-circle": {
                            transform: "scale(1.1)",
                            boxShadow: `0 14px 28px ${tokens.accent}44`,
                          },
                        }}
                      >
                        <SecurityIconCircle icon={Icon} tokens={tokens} />
                        <Box
                          sx={{
                            width: 2,
                            height: 44,
                            flexShrink: 0,
                            display: { xs: "none", md: "block" },
                            background: `linear-gradient(180deg, transparent, ${tokens.accent}88, transparent)`,
                          }}
                        />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 15, color: tokens.ink, mb: 0.3 }}>
                            {feature.title}
                          </Typography>
                          <Typography sx={{ color: tokens.inkMuted, fontSize: 12.5, lineHeight: 1.55 }}>
                            {feature.description}
                          </Typography>
                        </Box>
                      </Stack>
                    );
                  })}
                </Stack>
              </Grid>
            </Grid>

            <Box
              sx={{
                mt: { xs: 5, md: 6 },
                p: { xs: 2.5, md: 3 },
                borderRadius: 3,
                border: `1px solid ${tokens.line}`,
                backgroundColor: tokens.surface,
              }}
            >
              <Stack
                direction={{ xs: "column", md: "row" }}
                spacing={2.5}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={1.5} alignItems="center">
                  <ShieldCheck size={24} color={tokens.accent} />
                  <Box>
                    <Typography sx={{ fontFamily: fontDisplay, fontWeight: 700, color: tokens.ink }}>
                      Built for controlled service operations
                    </Typography>
                    <Typography sx={{ color: tokens.inkMuted, fontSize: 13.5, mt: 0.3 }}>
                      Permissions, activity trails and secure sessions work together to protect critical workflows.
                    </Typography>
                  </Box>
                </Stack>

                <Stack
                  direction="row"
                  spacing={1}
                  sx={{
                    flexWrap: "wrap",
                    rowGap: 1,
                    columnGap: 1,
                  }}
                >
                  {["Secure Authentication", "Role-Based Access", "Audit & Monitoring"].map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      sx={{
                        backgroundColor: tokens.accentSoft,
                        border: `1px solid ${tokens.line}`,
                        color: tokens.ink,
                        fontWeight: 600,
                      }}
                    />
                  ))}
                </Stack>
              </Stack>
            </Box>
          </Container>
        </Box>

        {/* ================================================== PRICING ================================================== */}
        <Box
          id="pricing"
          sx={{ py: { xs: 7, md: 9 }, backgroundColor: tokens.surfaceAlt, borderBottom: `1px solid ${tokens.line}` }}
        >
          <Container maxWidth="lg">
            <SectionHeading
              tokens={tokens}
              eyebrow="Pricing"
              title="Flexible plans for every stage of growth"
              description="Start small, prove the workflow, and scale your service operations as demand grows."
              align="center"
            />
            <Grid container spacing={3} alignItems="stretch">
              {pricingPlans.map((plan) => {
                const PlanIcon = plan.icon;
                const BadgeIcon = plan.badge?.icon;
                return (
                  <Grid key={plan.name} size={{ xs: 12, sm: 6, lg: 3 }}>
                    <Box
                      sx={{
                        position: "relative",
                        height: "100%",
                        display: "flex",
                        flexDirection: "column",
                        textAlign: "left",
                        borderRadius: 3,
                        border: plan.popular ? `2px solid ${plan.accent}` : `1px solid ${tokens.line}`,
                        backgroundColor: tokens.surface,
                        boxShadow: plan.popular ? `0 12px 30px ${plan.accent}22` : "none",
                        p: { xs: 3, md: 3.5 },
                        transition: "transform 300ms ease, box-shadow 300ms ease, border-color 300ms ease",
                        cursor: "pointer",
                        "&:hover": {
                          transform: "translateY(-10px)",
                          borderColor: plan.accent,
                          boxShadow: `0 24px 50px ${plan.accent}2E`,
                        },
                        "&:hover .plan-icon-avatar": {
                          transform: "scale(1.1) rotate(-4deg)",
                        },
                      }}
                    >
                      {/* Top row: badge pill (left) + "..." menu (right) */}
                      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 2 }}>
                        {plan.badge ? (
                          <Chip
                            icon={BadgeIcon ? <BadgeIcon size={13} color="#fff" /> : undefined}
                            label={plan.badge.label}
                            size="small"
                            sx={{
                              fontSize: 10.5,
                              fontWeight: 700,
                              letterSpacing: "0.02em",
                              color: "#fff",
                              backgroundColor: plan.badge.color,
                              "& .MuiChip-icon": { ml: "8px" },
                            }}
                          />
                        ) : (
                          <Box />
                        )}
                        <MoreHorizontal size={18} color={tokens.inkMuted} />
                      </Stack>

                      {/* Icon avatar */}
                      <Box
                        className="plan-icon-avatar"
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: "50%",
                          display: "grid",
                          placeItems: "center",
                          backgroundColor: plan.iconBg,
                          mb: 2,
                          transition: "transform 300ms ease",
                        }}
                      >
                        <PlanIcon size={20} color={plan.iconColor} strokeWidth={2} />
                      </Box>

                      <Typography sx={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 17, color: tokens.ink }}>
                        {plan.name}
                      </Typography>
                      <Typography sx={{ color: tokens.inkMuted, fontSize: 13, lineHeight: 1.5, mt: 0.6, minHeight: 38 }}>
                        {plan.description}
                      </Typography>

                      <Stack direction="row" alignItems="baseline" spacing={0.6} sx={{ mt: 1.5 }}>
                        <Typography sx={{ fontFamily: fontMono, fontSize: 28, fontWeight: 700, color: tokens.ink }}>
                          {plan.price}
                        </Typography>
                        <Typography sx={{ color: tokens.inkMuted, fontSize: 13 }}>{plan.period}</Typography>
                      </Stack>

                      {/* Employees / Ongoing queues stadium pill */}
                      <Stack
                        direction="row"
                        sx={{
                          mt: 2.5,
                          borderRadius: 999,
                          backgroundColor: tokens.surfaceAlt,
                          border: `1px solid ${tokens.line}`,
                          overflow: "hidden",
                        }}
                      >
                        <Box sx={{ flex: 1, textAlign: "center", py: 1.1, borderRight: `1px solid ${tokens.line}` }}>
                          <Typography
                            sx={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              color: tokens.inkMuted,
                              textTransform: "uppercase",
                            }}
                          >
                            Employees
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.ink }}>
                            {plan.employees}
                          </Typography>
                        </Box>
                        <Box sx={{ flex: 1, textAlign: "center", py: 1.1 }}>
                          <Typography
                            sx={{
                              fontSize: 9.5,
                              fontWeight: 700,
                              letterSpacing: "0.06em",
                              color: tokens.inkMuted,
                              textTransform: "uppercase",
                            }}
                          >
                            Queues
                          </Typography>
                          <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: tokens.ink }}>
                            {plan.queues}
                          </Typography>
                        </Box>
                      </Stack>

                      <Typography
                        sx={{
                          mt: 2.5,
                          mb: 1.3,
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          color: plan.accent,
                        }}
                      >
                        Benefits included
                      </Typography>

                      <Stack spacing={1.1} sx={{ textAlign: "left", flex: 1 }}>
                        {plan.features.map((feature) => (
                          <Stack key={feature} direction="row" spacing={1} alignItems="center">
                            <CheckCircle2 size={16} color={plan.accent} strokeWidth={2.2} />
                            <Typography sx={{ fontSize: 12.5, color: tokens.ink }}>{feature}</Typography>
                          </Stack>
                        ))}
                      </Stack>

                      <Button
                        fullWidth
                        variant={plan.popular ? "contained" : "outlined"}
                        onClick={() => (window.location.href = "/register")}
                        sx={{
                          mt: 3,
                          borderRadius: 999,
                          ...(plan.popular
                            ? {
                              backgroundColor: plan.accent,
                              color: "#fff",
                              "&:hover": { backgroundColor: plan.accent, opacity: 0.9 },
                            }
                            : {
                              borderColor: plan.accent,
                              color: plan.accent,
                              "&:hover": { borderColor: plan.accent, backgroundColor: `${plan.accent}14` },
                            }),
                        }}
                      >
                        {plan.button}
                      </Button>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
          </Container>
        </Box>

        {/* ================================================== CONTACT ================================================== */}
        <Box id="contact" sx={{ py: { xs: 7, md: 9 }, borderBottom: `1px solid ${tokens.line}` }}>
          <Container maxWidth="lg">
            <SectionHeading
              tokens={tokens}
              eyebrow="Contact"
              title="Let’s improve your service operations"
              description="Have a question about a plan, a feature, or rolling this out across multiple branches? Send us a message and our team will get back to you."
              align="center"
            />
            <Grid container spacing={{ xs: 4, md: 8 }} alignItems="flex-start">
              <Grid size={{ xs: 12, md: 5 }}>
                <Stack spacing={3}>
                  {[
                    { icon: Mail, label: "Email", value: "hello@indusserviceflow.com" },
                    { icon: Phone, label: "Phone", value: "+91 40 0000 0000" },
                    { icon: MapPin, label: "Office", value: "Hyderabad, Telangana, India" },
                  ].map((item) => (
                    <Stack key={item.label} direction="row" spacing={2} alignItems="center">
                      <IconBadge icon={item.icon} tokens={tokens} size={38} />
                      <Box>
                        <Typography sx={{ fontSize: 11.5, color: tokens.inkMuted }}>{item.label}</Typography>
                        <Typography sx={{ fontSize: 14, color: tokens.ink, fontWeight: 500 }}>{item.value}</Typography>
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </Grid>

              <Grid size={{ xs: 12, md: 7 }}>
                <Box
                  component="form"
                  onSubmit={handleContactSubmit}
                  sx={{
                    border: `1px solid ${tokens.line}`,
                    borderRadius: 2,
                    backgroundColor: tokens.surface,
                    p: { xs: 3, md: 4 },
                  }}
                >
                  <Stack spacing={2.5}>
                    <TextField
                      fullWidth
                      label="Full name"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      placeholder="Enter your full name"
                      variant="standard"
                      required
                      sx={inputSx}
                    />
                    <TextField
                      fullWidth
                      label="Email address"
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleInputChange}
                      placeholder="you@company.com"
                      variant="standard"
                      required
                      sx={inputSx}
                    />
                    <TextField
                      fullWidth
                      label="Subject"
                      name="subject"
                      value={form.subject}
                      onChange={handleInputChange}
                      placeholder="How can we help you?"
                      variant="standard"
                      required
                      sx={inputSx}
                    />
                    <TextField
                      fullWidth
                      label="Your message"
                      name="message"
                      value={form.message}
                      onChange={handleInputChange}
                      placeholder="Type your message..."
                      variant="standard"
                      multiline
                      minRows={4}
                      required
                      sx={inputSx}
                    />
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      endIcon={<Send size={17} />}
                      sx={{
                        backgroundColor: tokens.accent,
                        color: "#fff",
                        "&:hover": { backgroundColor: tokens.accent, opacity: 0.9 },
                      }}
                    >
                      Send message
                    </Button>
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Container>
        </Box>

        {/* ================================================== FOOTER ================================================== */}
        <Box component="footer" sx={{ backgroundColor: "#0A1628", color: "#B9C4D3", pt: { xs: 6, md: 7 } }}>
          <Container maxWidth="lg">
            <Grid container spacing={{ xs: 5, md: 3 }}>
              <Grid size={{ xs: 12, md: 3.4 }}>
                <Stack direction="row" spacing={1.4} alignItems="center" sx={{ mb: 1.8 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: "50%",
                      backgroundColor: "#fff",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      component="img"
                      src="/indusserviseflow logo.png"
                      alt="IndusServiceFlow"
                      sx={{ width: "70%", height: "70%", objectFit: "contain" }}
                    />
                  </Box>
                  <Box>
                    <Typography sx={{ fontFamily: fontDisplay, fontWeight: 700, fontSize: 16, color: "#fff", lineHeight: 1.2 }}>
                      IndusServiceFlow
                    </Typography>
                    <Typography sx={{ fontFamily: fontMono, fontSize: 9.5, color: "#7C8CA3", letterSpacing: "0.06em" }}>
                      SMART SERVICE OPERATIONS
                    </Typography>
                  </Box>
                </Stack>

                <Typography sx={{ color: "#8B98AC", fontSize: 13, lineHeight: 1.65, maxWidth: 280, mb: 2 }}>
                  Smart appointment and queue management for service-driven organizations. Reduce wait times, optimize resources, and deliver better experiences.
                </Typography>

                {/* "Powered by Orchasp" text lockup — replaces the broken logo image */}
                <Stack
                  direction="row"
                  spacing={1}
                  alignItems="center"
                  sx={{
                    display: "inline-flex",
                    mb: 2.5,
                    px: 1.4,
                    py: 0.7,
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.14)",
                    backgroundColor: "rgba(255,255,255,0.04)",
                  }}
                >
                  <Typography sx={{ fontSize: 11, color: "#8B98AC" }}>Powered by</Typography>
                  <Typography
                    sx={{
                      fontFamily: fontDisplay,
                      fontWeight: 700,
                      fontSize: 12.5,
                      color: "#fff",
                      letterSpacing: "0.02em",
                    }}
                  >
                    Orchasp
                  </Typography>
                </Stack>

                <Stack spacing={2.2}>
                  <Stack direction="row" spacing={1.2}>
                    {[Globe, Mail, MessageSquare, Send].map((SocialIcon, i) => (
                      <Box
                        key={i}
                        sx={{
                          width: 34,
                          height: 34,
                          borderRadius: "50%",
                          border: "1px solid rgba(255,255,255,0.18)",
                          display: "grid",
                          placeItems: "center",
                          cursor: "pointer",
                          "&:hover": { borderColor: tokens.accent },
                        }}
                      >
                        <SocialIcon size={15} color="#B9C4D3" />
                      </Box>
                    ))}
                  </Stack>
                </Stack>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2.15 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: "#fff", mb: 1.8 }}>Platform</Typography>
                <Stack spacing={1.1}>
                  {[
                    ["Features", "platform"],
                    ["How It Works", "workflow"],
                    ["Security", "security"],
                    ["Pricing", "pricing"],
                    ["Integrations", "platform"],
                    ["Updates", "platform"],
                  ].map(([label, id]) => (
                    <Button
                      key={label}
                      onClick={() => scrollToSection(id)}
                      sx={{
                        justifyContent: "flex-start",
                        color: "#8B98AC",
                        p: 0,
                        minHeight: 22,
                        fontSize: 13,
                        fontWeight: 400,
                        "&:hover": { color: "#fff", backgroundColor: "transparent" },
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2.15 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: "#fff", mb: 1.8 }}>Solutions</Typography>
                <Stack spacing={1.1}>
                  {["Hospitals", "Clinics", "Banks", "Retail Stores", "Government", "Customer Support"].map(
                    (item) => (
                      <Button
                        key={item}
                        onClick={() => scrollToSection("solutions")}
                        sx={{
                          justifyContent: "flex-start",
                          color: "#8B98AC",
                          p: 0,
                          minHeight: 22,
                          fontSize: 13,
                          fontWeight: 400,
                          "&:hover": { color: "#fff", backgroundColor: "transparent" },
                        }}
                      >
                        {item}
                      </Button>
                    )
                  )}
                </Stack>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2.15 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: "#fff", mb: 1.8 }}>Company</Typography>
                <Stack spacing={1.1}>
                  {[
                    ["About Us", "platform"],
                    ["Contact Us", "contact"],
                    ["Careers", "contact"],
                    ["Blog", "platform"],
                    ["Press Kit", "platform"],
                    ["Partners", "contact"],
                  ].map(([label, id]) => (
                    <Button
                      key={label}
                      onClick={() => scrollToSection(id)}
                      sx={{
                        justifyContent: "flex-start",
                        color: "#8B98AC",
                        p: 0,
                        minHeight: 22,
                        fontSize: 13,
                        fontWeight: 400,
                        "&:hover": { color: "#fff", backgroundColor: "transparent" },
                      }}
                    >
                      {label}
                    </Button>
                  ))}
                </Stack>
              </Grid>

              <Grid size={{ xs: 6, sm: 3, md: 2.15 }}>
                <Typography sx={{ fontWeight: 700, fontSize: 13.5, color: "#fff", mb: 1.8 }}>Account</Typography>
                <Stack spacing={1.1}>
                  <Button
                    onClick={() => (window.location.href = "/login")}
                    sx={{
                      justifyContent: "flex-start",
                      color: "#8B98AC",
                      p: 0,
                      minHeight: 22,
                      fontSize: 13,
                      fontWeight: 400,
                      "&:hover": { color: "#fff", backgroundColor: "transparent" },
                    }}
                  >
                    Login
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/register")}
                    sx={{
                      justifyContent: "flex-start",
                      color: "#8B98AC",
                      p: 0,
                      minHeight: 22,
                      fontSize: 13,
                      fontWeight: 400,
                      "&:hover": { color: "#fff", backgroundColor: "transparent" },
                    }}
                  >
                    Register
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/book")}
                    sx={{
                      justifyContent: "flex-start",
                      color: "#8B98AC",
                      p: 0,
                      minHeight: 22,
                      fontSize: 13,
                      fontWeight: 400,
                      "&:hover": { color: "#fff", backgroundColor: "transparent" },
                    }}
                  >
                    Book Appointment
                  </Button>
                  <Button
                    onClick={() => (window.location.href = "/contact")}
                    sx={{
                      justifyContent: "flex-start",
                      color: "#8B98AC",
                      p: 0,
                      minHeight: 22,
                      fontSize: 13,
                      fontWeight: 400,
                      "&:hover": { color: "#fff", backgroundColor: "transparent" },
                    }}
                  >
                    Help Center
                  </Button>
                  <Typography sx={{ fontSize: 13, color: "#4E5A6E", mt: 0.3 }}>Terms &amp; Privacy</Typography>
                </Stack>
              </Grid>
            </Grid>

            <Divider sx={{ my: 4, borderColor: "rgba(255,255,255,0.1)" }} />

            <Grid container spacing={3} sx={{ pb: 3 }}>
              {[
                {
                  icon: Lock,
                  title: "Enterprise Grade Security",
                  description: "Secure & compliant platform you can trust",
                },
                { icon: Clock3, title: "99.9% Uptime", description: "Reliable performance you can count on" },
                { icon: Headphones, title: "24/7 Support", description: "Dedicated support whenever you need it" },
                { icon: Users, title: "10K+ Organizations", description: "Trusted by thousands worldwide" },
              ].map((item) => {
                const TrustIcon = item.icon;
                return (
                  <Grid key={item.title} size={{ xs: 12, sm: 6, md: 3 }}>
                    <Stack direction="row" spacing={1.5} alignItems="flex-start">
                      <TrustIcon size={20} color={tokens.accent} />
                      <Box>
                        <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#fff", mb: 0.3 }}>
                          {item.title}
                        </Typography>
                        <Typography sx={{ color: "#8B98AC", fontSize: 12, lineHeight: 1.5 }}>
                          {item.description}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>
                );
              })}
            </Grid>

            <Divider sx={{ borderColor: "rgba(255,255,255,0.1)" }} />

            <Box sx={{ py: 3, textAlign: "center" }}>
              <Typography sx={{ color: "#5F6C80", fontSize: 12 }}>
                © 2026 IndusServiceFlow. All rights reserved. · Powered by Orchasp
              </Typography>
            </Box>
          </Container>
        </Box>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={5000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "center" }}
          sx={{ mt: 8 }}
        >
          <Alert
            severity={snackbar.severity}
            variant="filled"
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            sx={{ width: "100%", minWidth: { xs: "auto", sm: 420 } }}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}