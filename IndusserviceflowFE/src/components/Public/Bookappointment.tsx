import { jsPDF } from "jspdf";

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  MenuItem,
  Button,
  Stepper,
  Step,
  StepLabel,
  Checkbox,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  Alert,
  Avatar,
  ThemeProvider,
  CssBaseline,
  alpha,
} from "@mui/material";
import {
  Home as HomeIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Apartment as ApartmentIcon,
  Build as BuildIcon,
  EventAvailable as EventAvailableIcon,
  AccessTime as AccessTimeIcon,
  Check as CheckIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  CheckCircle as CheckCircleIcon,
  ManageAccounts as ManageAccountsIcon,
  AutoAwesome as AutoAwesomeIcon,
  WarningAmber as WarningAmberIcon,
  WbSunny as WbSunnyIcon,
  WbTwilight as WbTwilightIcon,
  Bedtime as BedtimeIcon,
  Download as DownloadIcon,
  Tag as TagIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  MonitorHeart as MonitorHeartIcon,
  MedicalServices as MedicalServicesIcon,
  AccountBalance as AccountBalanceIcon,
  ShoppingBag as ShoppingBagIcon,
  SupportAgent as SupportAgentIcon,
  Apps as AppsIcon,
  Star as StarIcon,
} from "@mui/icons-material";

import {
  getOrganizationCategories,
  getOrganizationsByCategory,
  getOrgId,
  getPublicOrgServices,
  getPublicOrgEmployees,
  getPublicEmployeeServiceLinks,
  createPublicAppointment,
  type OrganizationCategory,
  type PublicOrganization,
} from "../../services/organisationservice";
import type {
  CatalogService,
  CatalogEmployee,
  EmployeeServiceLink,
} from "../../services/catalogService";
import {
  getAvailableSlotsForAssignments,
  getAvailableSlotsForServices,
  type Appointment,
} from "../../services/appointmentService";
import {
  getNameError,
  getMobileError,
  getEmailError,
  sanitizeNameInput,
  sanitizeMobileInput,
} from "../../utils/validators";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";

type Gender = "Male" | "Female" | "Other";

const STEPS = ["Your details", "Service & staff", "Date & time", "Review"];

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  gender: "" as Gender | "",
  categoryId: "",
  orgId: "",
  orgName: "",
  orgCategoryName: "",
  serviceIds: [] as number[],
  employeeAssignments: {} as Record<number, number | "">,
  date: "",
  time: "",
  notes: "",
};

const timeToMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const fmt12 = (t: string) => {
  const min = timeToMin(t);
  const h24 = Math.floor(min / 60);
  const m = min % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
};

const dateKey = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

const formatFee = (fee: string | number) => {
  const n = typeof fee === "string" ? parseFloat(fee) : fee;
  return n > 0 ? `₹${n.toLocaleString("en-IN")}` : "Free";
};

const formatFeeForPdf = (fee: string | number) => {
  const n = typeof fee === "string" ? parseFloat(fee) : fee;
  return n > 0 ? n.toLocaleString("en-IN") : "Free";
};

const employeeMeta = (e: CatalogEmployee) => {
  const parts: string[] = [];
  if (e.shift_name) parts.push(e.shift_name);
  if (e.rating !== null && e.rating !== undefined && e.rating !== "") {
    const n = typeof e.rating === "string" ? parseFloat(e.rating) : e.rating;
    if (!Number.isNaN(n)) parts.push(`${n.toFixed(1)} ★`);
  }
  return parts.join(" · ");
};

const periodOf = (t: string): "Morning" | "Afternoon" | "Evening" => {
  const m = timeToMin(t);
  if (m < 12 * 60) return "Morning";
  if (m < 16 * 60) return "Afternoon";
  return "Evening";
};

const periodIcon = {
  Morning: WbSunnyIcon,
  Afternoon: WbTwilightIcon,
  Evening: BedtimeIcon,
} as const;

const categoryIcon = (name: string | undefined) => {
  switch ((name || "").toLowerCase()) {
    case "hospitals":
    case "hospital":
      return <MonitorHeartIcon fontSize="small" />;
    case "clinics":
    case "clinic":
      return <MedicalServicesIcon fontSize="small" />;
    case "banks":
    case "bank":
      return <AccountBalanceIcon fontSize="small" />;
    case "retail":
      return <ShoppingBagIcon fontSize="small" />;
    case "customer support":
      return <SupportAgentIcon fontSize="small" />;
    default:
      return <AppsIcon fontSize="small" />;
  }
};

const cardSx = {
  borderRadius: 3,
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 8px 24px rgba(14,60,97,0.08)",
};

const RECEIPT_NAVY: [number, number, number] = [24, 42, 92];
const RECEIPT_NAVY_DARK: [number, number, number] = [15, 28, 64];
const RECEIPT_TEAL: [number, number, number] = [22, 163, 148];
const RECEIPT_GRAY_TEXT: [number, number, number] = [107, 114, 128];
const RECEIPT_GRID_LINE: [number, number, number] = [223, 228, 236];
const RECEIPT_ROW_ALT: [number, number, number] = [244, 247, 251];
const RECEIPT_INK: [number, number, number] = [31, 41, 55];
const RECEIPT_ORCHASP_BLUE: [number, number, number] = [37, 99, 235];

const RECEIPT_STATUS_COLORS: Record<
  string,
  [[number, number, number], [number, number, number]]
> = {
  completed: [
    [230, 248, 239],
    [15, 122, 77],
  ],
  confirmed: [
    [230, 248, 239],
    [15, 122, 77],
  ],
  active: [
    [230, 248, 239],
    [15, 122, 77],
  ],
  waiting: [
    [253, 243, 223],
    [154, 106, 18],
  ],
  "in progress": [
    [253, 243, 223],
    [154, 106, 18],
  ],
  pending: [
    [253, 243, 223],
    [154, 106, 18],
  ],
  cancelled: [
    [240, 241, 243],
    [107, 114, 128],
  ],
  inactive: [
    [240, 241, 243],
    [107, 114, 128],
  ],
  "no show": [
    [253, 237, 237],
    [179, 38, 30],
  ],
  "left queue": [
    [253, 237, 237],
    [179, 38, 30],
  ],
  rejected: [
    [253, 237, 237],
    [179, 38, 30],
  ],
};

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={superAdminMuiTheme}>
      <CssBaseline />
      <Box
        sx={{
          minHeight: "100vh",
          bgcolor: "background.default",
          backgroundImage:
            "radial-gradient(circle at 15% 10%, rgba(14,165,233,0.10), transparent 45%), radial-gradient(circle at 85% 90%, rgba(79,70,229,0.10), transparent 45%)",
          py: { xs: 3, sm: 5 },
          px: 2,
        }}
      >
        <Box sx={{ maxWidth: 760, mx: "auto" }}>
          <Box sx={{ mb: 2.5 }}>
            <Button
              component={Link}
              to="/"
              color="inherit"
              size="small"
              startIcon={<HomeIcon fontSize="small" />}
              sx={{ color: "text.secondary" }}
            >
              Home
            </Button>
          </Box>
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}

const ReviewRow = ({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) => (
  <Stack
    direction={{ xs: "column", sm: "row" }}
    spacing={0.5}
    sx={{
      py: 1.25,
      borderBottom: "1px solid",
      borderColor: "divider",
      justifyContent: "space-between",
      alignItems: { xs: "flex-start", sm: "center" },
      "&:last-of-type": { borderBottom: "none" },
    }}
  >
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", color: "text.secondary" }}
    >
      {icon}
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        {label}
      </Typography>
    </Stack>
    <Box sx={{ textAlign: { xs: "left", sm: "right" } }}>{children}</Box>
  </Stack>
);

const BookAppointment = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [manuallyAssigned, setManuallyAssigned] = useState<Set<number>>(
    new Set(),
  );

  const [pickEmployee, setPickEmployee] = useState(false);

  const [categories, setCategories] = useState<OrganizationCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [organizations, setOrganizations] = useState<PublicOrganization[]>([]);
  const [loadingOrganizations, setLoadingOrganizations] = useState(false);
  const [organizationsError, setOrganizationsError] = useState<string | null>(
    null,
  );

  const [services, setServices] = useState<CatalogService[]>([]);
  const [employees, setEmployees] = useState<CatalogEmployee[]>([]);
  const [links, setLinks] = useState<EmployeeServiceLink[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);

  const today = useMemo(() => new Date(), []);
  const minDate = dateKey(today);

  const loadCategories = () => {
    setLoadingCategories(true);
    setCategoriesError(null);
    getOrganizationCategories()
      .then((res) =>
        setCategories(
          Array.isArray(res.data)
            ? res.data.filter((c) => c.status === "Active" || !c.status)
            : [],
        ),
      )
      .catch(() => {
        setCategories([]);
        setCategoriesError(
          "Couldn't load organization categories. Please try again.",
        );
      })
      .finally(() => setLoadingCategories(false));
  };

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (!form.categoryId) {
      setOrganizations([]);
      return;
    }
    let cancelled = false;
    setLoadingOrganizations(true);
    setOrganizationsError(null);
    getOrganizationsByCategory(form.categoryId)
      .then((res) => {
        if (!cancelled)
          setOrganizations(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (!cancelled) {
          setOrganizations([]);
          setOrganizationsError(
            "Couldn't load organizations for this category. Please try again.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingOrganizations(false);
      });
    return () => {
      cancelled = true;
    };
  }, [form.categoryId]);

  const selectedOrg = useMemo(
    () => organizations.find((o) => String(getOrgId(o)) === String(form.orgId)),
    [organizations, form.orgId],
  );

  useEffect(() => {
    if (!form.orgId) {
      setServices([]);
      setEmployees([]);
      setLinks([]);
      setCatalogError(null);
      setLoadingCatalog(false);
      return;
    }
    let cancelled = false;
    setLoadingCatalog(true);
    setCatalogError(null);

    Promise.all([
      getPublicOrgServices(form.orgId),
      getPublicOrgEmployees(form.orgId),
      getPublicEmployeeServiceLinks(form.orgId),
    ])
      .then(([svcRes, empRes, linkRes]) => {
        if (cancelled) return;
        setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        setLinks(Array.isArray(linkRes.data) ? linkRes.data : []);
      })
      .catch(() => {
        if (!cancelled)
          setCatalogError(
            "Couldn't load services for this organization. Please try again.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, [form.orgId]);

  const orgEmployeeIds = useMemo(
    () => new Set(employees.map((e) => e.employee_id)),
    [employees],
  );

  const qualifiedEmployeesByService = useMemo(() => {
    const map: Record<number, CatalogEmployee[]> = {};
    services.forEach((s) => {
      const qualifiedIds = links
        .filter(
          (l) =>
            l.service === s.service_id &&
            l.status === "Active" &&
            orgEmployeeIds.has(l.employee),
        )
        .map((l) => l.employee);
      map[s.service_id] = employees.filter((e) =>
        qualifiedIds.includes(e.employee_id),
      );
    });
    return map;
  }, [services, links, employees, orgEmployeeIds]);

  const selectedServices = useMemo(
    () => services.filter((s) => form.serviceIds.includes(s.service_id)),
    [services, form.serviceIds],
  );

  const totalFee = useMemo(
    () =>
      selectedServices.reduce((sum, s) => sum + parseFloat(s.fee || "0"), 0),
    [selectedServices],
  );
  const totalDuration = useMemo(
    () => selectedServices.reduce((sum, s) => sum + (s.duration || 0), 0),
    [selectedServices],
  );

  useEffect(() => {
    if (!pickEmployee) {
      setForm((f) =>
        Object.keys(f.employeeAssignments).length
          ? { ...f, employeeAssignments: {} }
          : f,
      );
      return;
    }

    setForm((f) => {
      const next = { ...f.employeeAssignments };
      let changed = false;

      f.serviceIds.forEach((sid) => {
        if (next[sid] !== undefined || manuallyAssigned.has(sid)) return;
        const first = (qualifiedEmployeesByService[sid] ?? [])[0];
        if (first) {
          next[sid] = first.employee_id;
          changed = true;
        }
      });

      Object.keys(next).forEach((key) => {
        const sid = Number(key);
        if (!f.serviceIds.includes(sid)) {
          delete next[sid];
          changed = true;
        }
      });

      return changed ? { ...f, employeeAssignments: next } : f;
    });
  }, [
    pickEmployee,
    form.serviceIds,
    qualifiedEmployeesByService,
    manuallyAssigned,
  ]);

  const toggleService = (id: number) => {
    const qualified = (qualifiedEmployeesByService[id] ?? []).length > 0;
    if (!qualified) return;
    setForm((f) => ({
      ...f,
      serviceIds: f.serviceIds.includes(id)
        ? f.serviceIds.filter((x) => x !== id)
        : [...f.serviceIds, id],
    }));
  };

  const isToday = form.date === minDate;
  const nowMin = today.getHours() * 60 + today.getMinutes();

  const [fetchedSlots, setFetchedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  useEffect(() => {
    if (!form.orgId || !form.date || form.serviceIds.length === 0) {
      setFetchedSlots([]);
      setSlotsError(null);
      return;
    }

    let cancelled = false;

    let request: ReturnType<typeof getAvailableSlotsForServices> | null = null;

    if (pickEmployee) {
      const assignments = form.serviceIds
        .map((serviceId) => ({
          service_id: serviceId,
          employee_id: form.employeeAssignments[serviceId],
        }))
        .filter((item): item is { service_id: number; employee_id: number } =>
          Boolean(item.employee_id),
        );

      if (assignments.length === form.serviceIds.length) {
        request = getAvailableSlotsForAssignments(
          form.orgId,
          form.date,
          assignments,
        );
      }
    } else {
      request = getAvailableSlotsForServices(
        form.orgId,
        form.date,
        form.serviceIds,
      );
    }

    if (!request) {
      setFetchedSlots([]);
      setSlotsError(null);
      setSlotsLoading(false);
      return;
    }

    setSlotsLoading(true);
    setSlotsError(null);

    request
      .then((res) => {
        if (cancelled) return;
        setFetchedSlots(res.data.available_slots || []);
      })
      .catch(() => {
        if (cancelled) return;
        setFetchedSlots([]);
        setSlotsError("Couldn't load available times. Please try again.");
      })
      .finally(() => {
        if (!cancelled) setSlotsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    form.orgId,
    form.date,
    pickEmployee,
    JSON.stringify(form.serviceIds),
    JSON.stringify(form.employeeAssignments),
  ]);

  const availableTimeSlots = useMemo(() => {
    if (!isToday) return fetchedSlots;
    return fetchedSlots.filter((t) => timeToMin(t) > nowMin);
  }, [fetchedSlots, isToday, nowMin]);

  useEffect(() => {
    if (form.time && !slotsLoading && !availableTimeSlots.includes(form.time)) {
      setForm((f) => ({ ...f, time: "" }));
    }
  }, [availableTimeSlots, slotsLoading]);

  const slotsByPeriod = useMemo(() => {
    const groups: Record<string, string[]> = {
      Morning: [],
      Afternoon: [],
      Evening: [],
    };
    availableTimeSlots.forEach((t) => groups[periodOf(t)].push(t));
    return groups;
  }, [availableTimeSlots]);

  const nameError = getNameError(form.name, "Name");
  const mobileError = getMobileError(form.mobile.trim());
  const emailError = getEmailError(form.email.trim());
  const nameValid = !nameError;
  const mobileValid = !mobileError;
  const emailValid = !emailError;
  const stepOneValid =
    nameValid && mobileValid && emailValid && !!form.categoryId && !!form.orgId;
  const stepTwoValid = form.serviceIds.length > 0;

  const assignmentsForValidation = useMemo(() => {
    if (!pickEmployee) return true;
    if (!form.serviceIds.length) return false;
    return form.serviceIds.every((sid) =>
      Boolean(form.employeeAssignments[sid]),
    );
  }, [pickEmployee, form.serviceIds, form.employeeAssignments]);

  const stepThreeValid = !!form.date && !!form.time && assignmentsForValidation;

  const goNext = () => {
    setSubmitError(null);
    if (step === 1) {
      setTouched((t) => ({
        ...t,
        name: true,
        mobile: true,
        email: true,
        categoryId: true,
        orgId: true,
      }));
      if (!stepOneValid) return;
    }
    if (step === 2 && !stepTwoValid) return;
    if (step === 3 && !stepThreeValid) return;
    setStep((s) => Math.min(4, s + 1));
  };

  const goBack = () => {
    setSubmitError(null);
    setStep((s) => Math.max(1, s - 1));
  };

  const submit = async () => {
    if (!form.orgId || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await createPublicAppointment({
        org_id: form.orgId,
        customer_name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        gender: form.gender || undefined,
        date: form.date,
        time: `${form.time}:00`,
        remarks: form.notes || undefined,
        services: form.serviceIds.map((sid) => ({
          service_id: sid,
          employee_id: pickEmployee
            ? form.employeeAssignments[sid] || undefined
            : undefined,
        })),
      });
      setConfirmed(res.data.data);
    } catch (err: unknown) {
      const error = err as {
        response?: {
          status?: number;
          data?: { message?: string };
        };
      };
      const isConflict = error.response?.status === 409;
      setSubmitError(
        error.response?.data?.message ||
          (isConflict
            ? "That slot was just taken by someone else. Please go back and pick another time."
            : "Couldn't book this appointment. Please check the details and try again."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const fmtDateLong = (d: string) => {
    if (!d) return "-";
    const parsed = new Date(`${d}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return d;
    return parsed.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const displayOrgName = selectedOrg?.organization_name || form.orgName;
  const displayOrgCategory = selectedOrg?.category_name || form.orgCategoryName;

  const OrgChip = () =>
    displayOrgName ? (
      <Chip
        icon={categoryIcon(displayOrgCategory)}
        label={
          displayOrgCategory
            ? `${displayOrgName} · ${displayOrgCategory}`
            : displayOrgName
        }
        variant="outlined"
        sx={{ alignSelf: "flex-start", fontWeight: 600 }}
      />
    ) : null;

  const downloadReceipt = (appt: Appointment) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
    const contentWidth = pageWidth - marginX * 2;
    const HEADER_H = 92;
    const FOOTER_H = 58;
    let y = 0;

    const orgName = displayOrgName || "Appointment";

    const generatedAt = new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const fmtDateTimeLong = (d: string) => {
      if (!d) return "-";
      const parsed = new Date(d);
      if (Number.isNaN(parsed.getTime())) return d;
      return parsed.toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    };

    const drawHeader = () => {
      doc.setFillColor(...RECEIPT_NAVY);
      doc.rect(0, 0, pageWidth, HEADER_H, "F");
      doc.setFillColor(...RECEIPT_TEAL);
      doc.rect(0, HEADER_H, pageWidth, 3, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text("IndusServiceFlow", marginX, 40);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text("Flowing Services, Building Trust", marginX, 54);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("APPOINTMENT RECEIPT", pageWidth / 2, 42, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("Booking confirmation", pageWidth / 2, 56, { align: "center" });

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(orgName, pageWidth - marginX, 40, { align: "right" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(generatedAt, pageWidth - marginX, 54, { align: "right" });

      y = HEADER_H + 3 + 28;
    };

    const drawFooter = (pageNum: number, totalPages: number) => {
      const lineY = pageHeight - FOOTER_H;
      doc.setDrawColor(...RECEIPT_GRID_LINE);
      doc.setLineWidth(0.6);
      doc.line(marginX, lineY, pageWidth - marginX, lineY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.3);
      doc.setTextColor(...RECEIPT_NAVY_DARK);
      doc.text("IndusServiceFlow", marginX, lineY + 14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(...RECEIPT_ORCHASP_BLUE);
      doc.text("Powered by Orchasp Limited", marginX, lineY + 24);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.6);
      doc.setTextColor(...RECEIPT_GRAY_TEXT);
      doc.text(`Printed On: ${generatedAt}`, marginX, pageHeight - 12);
      doc.text(
        `Page ${pageNum} of ${totalPages}`,
        pageWidth / 2,
        pageHeight - 12,
        { align: "center" },
      );
      doc.text(
        "Confidential - For Internal Use Only",
        pageWidth - marginX,
        pageHeight - 12,
        { align: "right" },
      );
    };

    const ensureSpace = (needed: number) => {
      if (y + needed > pageHeight - FOOTER_H - 10) {
        doc.addPage();
        y = 32;
      }
    };

    let sectionNumber = 0;
    const sectionHeading = (title: string) => {
      sectionNumber += 1;
      ensureSpace(30);
      doc.setFillColor(...RECEIPT_NAVY);
      doc.circle(marginX + 8, y - 3, 8.5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.text(String(sectionNumber), marginX + 8, y, { align: "center" });

      doc.setTextColor(...RECEIPT_NAVY);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11.5);
      doc.text(title, marginX + 22, y);

      doc.setDrawColor(...RECEIPT_TEAL);
      doc.setLineWidth(1.4);
      doc.line(marginX, y + 8, pageWidth - marginX, y + 8);
      y += 24;
    };

    const infoRow = (label: string, value: string) => {
      ensureSpace(20);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...RECEIPT_GRAY_TEXT);
      doc.text(label, marginX, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9.8);
      doc.setTextColor(...RECEIPT_INK);
      doc.text(value, pageWidth - marginX, y, { align: "right" });
      y += 8;
      doc.setDrawColor(...RECEIPT_GRID_LINE);
      doc.setLineWidth(0.6);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 14;
    };

    const drawSummaryCards = () => {
      const gap = 12;
      const cardW = (contentWidth - gap * 2) / 3;
      const cardH = 52;
      const cards: {
        label: string;
        value: string;
        bg: [number, number, number];
        fg: [number, number, number];
      }[] = [
        {
          label: "APPOINTMENT NO.",
          value: appt.appointment_number,
          bg: [234, 240, 254],
          fg: [26, 47, 110],
        },
        {
          label: "TOKEN NO.",
          value: String(appt.token_number),
          bg: [234, 246, 251],
          fg: [11, 110, 143],
        },
        {
          label: "STATUS",
          value: appt.status,
          ...(() => {
            const [bg, fg] = RECEIPT_STATUS_COLORS[
              appt.status?.toLowerCase()
            ] ?? [
              [234, 240, 254],
              [26, 47, 110],
            ];
            return { bg, fg };
          })(),
        },
      ];

      cards.forEach((card, idx) => {
        const cx = marginX + idx * (cardW + gap);
        doc.setFillColor(...card.bg);
        doc.roundedRect(cx, y, cardW, cardH, 5, 5, "F");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7);
        doc.setTextColor(...RECEIPT_GRAY_TEXT);
        doc.text(card.label, cx + 10, y + 16);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(13);
        doc.setTextColor(...card.fg);
        const val = doc.splitTextToSize(card.value, cardW - 20);
        doc.text(val[0] ?? card.value, cx + 10, y + 36);
      });

      y += cardH + 22;
    };

    const drawServicesTable = () => {
      const cols = [
        { key: "service", label: "SERVICE", w: contentWidth * 0.36 },
        { key: "staff", label: "STAFF", w: contentWidth * 0.28 },
        { key: "duration", label: "DURATION", w: contentWidth * 0.16 },
        { key: "fee", label: "FEE", w: contentWidth * 0.2 },
      ];
      const rowH = 22;
      const headerH = 22;

      ensureSpace(headerH + rowH);
      let cx = marginX;
      doc.setFillColor(...RECEIPT_NAVY);
      doc.rect(marginX, y, contentWidth, headerH, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      cols.forEach((col) => {
        doc.text(col.label, cx + 8, y + 14);
        cx += col.w;
      });
      y += headerH;

      appt.services.forEach((s, idx) => {
        ensureSpace(rowH);
        if (idx % 2 === 1) {
          doc.setFillColor(...RECEIPT_ROW_ALT);
          doc.rect(marginX, y, contentWidth, rowH, "F");
        }
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.3);
        doc.setTextColor(...RECEIPT_INK);
        cx = marginX;
        const values = [
          s.service_name,
          s.employee_name ?? "To be assigned",
          `${s.duration_min} min`,
          formatFeeForPdf(s.fee),
        ];
        cols.forEach((col, i) => {
          const truncated =
            doc.splitTextToSize(values[i], col.w - 12)[0] ?? values[i];
          doc.text(truncated, cx + 8, y + 14);
          cx += col.w;
        });
        y += rowH;
      });

      doc.setDrawColor(...RECEIPT_GRID_LINE);
      doc.setLineWidth(0.6);
      doc.line(marginX, y, pageWidth - marginX, y);
      y += 16;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...RECEIPT_GRAY_TEXT);
      doc.text("Total duration", marginX, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...RECEIPT_INK);
      doc.text(`${appt.total_duration_min} min`, pageWidth - marginX, y, {
        align: "right",
      });
      y += 18;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...RECEIPT_GRAY_TEXT);
      doc.text("Total fee", marginX, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...RECEIPT_TEAL);
      doc.text(formatFeeForPdf(appt.total_fee), pageWidth - marginX, y, {
        align: "right",
      });
      y += 22;
    };

    drawHeader();
    drawSummaryCards();

    sectionHeading("Customer Details");
    infoRow("Name", appt.customer_name);
    infoRow("Mobile", appt.customer_mobile);
    if (appt.customer_email) infoRow("Email", appt.customer_email);

    sectionHeading("Appointment Details");
    infoRow("Date", fmtDateLong(appt.date));
    infoRow("Time", fmt12(appt.time.slice(0, 5)));
    if (appt.created_on) infoRow("Booked on", fmtDateTimeLong(appt.created_on));

    sectionHeading("Services");
    drawServicesTable();

    ensureSpace(30);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8.5);
    doc.setTextColor(...RECEIPT_GRAY_TEXT);
    doc.text(
      "Please arrive 10 minutes before your scheduled time. Thank you for booking with us.",
      pageWidth / 2,
      y,
      {
        align: "center",
      },
    );

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p += 1) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    doc.save(`receipt-${appt.appointment_number}.pdf`);
  };

  if (confirmed) {
    return (
      <PageShell>
        <Stack
          spacing={1.5}
          sx={{ mb: 3, textAlign: "center", alignItems: "center" }}
        >
          <Avatar sx={{ width: 64, height: 64, bgcolor: "success.main" }}>
            <CheckIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography
            variant="h5"
            sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}
          >
            Appointment booked!
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Confirmed for {confirmed.customer_name}
          </Typography>
        </Stack>

        <Paper elevation={0} sx={{ ...cardSx, p: { xs: 2.5, sm: 3.5 } }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2.5,
            }}
          >
            <Chip
              icon={categoryIcon(displayOrgCategory)}
              label={displayOrgName || "Organization"}
              variant="outlined"
              sx={{ fontWeight: 600 }}
            />
            <Chip
              size="small"
              label={confirmed.status}
              color="success"
              sx={{ fontWeight: 600 }}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
              gap: 2,
              mb: 2.5,
            }}
          >
            <Box>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ color: "text.secondary", mb: 0.25, alignItems: "center" }}
              >
                <TagIcon fontSize="small" />
                <Typography variant="caption">Appointment No.</Typography>
              </Stack>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}
              >
                {confirmed.appointment_number}
              </Typography>
            </Box>
            <Box>
              <Stack
                direction="row"
                spacing={0.75}
                sx={{ color: "text.secondary", mb: 0.25, alignItems: "center" }}
              >
                <ConfirmationNumberIcon fontSize="small" />
                <Typography variant="caption">Token No.</Typography>
              </Stack>
              <Typography
                variant="h6"
                sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}
              >
                {confirmed.token_number}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 1 }} />

          <ReviewRow
            icon={<ApartmentIcon fontSize="small" />}
            label="Organization"
          >
            <Typography variant="body2">{displayOrgName || "-"}</Typography>
          </ReviewRow>
          <ReviewRow
            icon={<EventAvailableIcon fontSize="small" />}
            label="Date"
          >
            <Typography variant="body2">
              {fmtDateLong(confirmed.date)}
            </Typography>
          </ReviewRow>
          <ReviewRow icon={<AccessTimeIcon fontSize="small" />} label="Time">
            <Typography variant="body2">
              {fmt12(confirmed.time.slice(0, 5))}
            </Typography>
          </ReviewRow>
          <ReviewRow icon={<BuildIcon fontSize="small" />} label="Services">
            <Stack
              spacing={0.5}
              sx={{ alignItems: { xs: "flex-start", sm: "flex-end" } }}
            >
              {confirmed.services.map((s) => (
                <Typography key={s.appointment_service_id} variant="body2">
                  {s.service_name} → {s.employee_name ?? "To be assigned"} ·{" "}
                  {s.duration_min} min · {formatFee(s.fee)}
                </Typography>
              ))}
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Total: {confirmed.total_duration_min} min ·{" "}
                {formatFee(confirmed.total_fee)}
              </Typography>
            </Stack>
          </ReviewRow>

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2.5 }}
          >
            Please arrive 10 minutes before your scheduled time.
          </Typography>
        </Paper>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            color="inherit"
            size="large"
            fullWidth
            startIcon={<DownloadIcon />}
            onClick={() => downloadReceipt(confirmed)}
          >
            Download receipt
          </Button>
          <Button
            variant="contained"
            size="large"
            fullWidth
            onClick={() => {
              setForm(emptyForm);
              setTouched({});
              setManuallyAssigned(new Set());
              setConfirmed(null);
              setStep(1);
            }}
          >
            Book another appointment
          </Button>
        </Stack>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <Stack spacing={0.5} sx={{ mb: 3, textAlign: "center" }}>
        <Typography
          variant="overline"
          sx={{ color: "primary.main", fontWeight: 700, letterSpacing: 1 }}
        >
          Public booking
        </Typography>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}
        >
          Book an Appointment
        </Typography>
        <Typography variant="body2" color="text.secondary">
          No login required. Confirmation in seconds.
        </Typography>
      </Stack>

      <Paper elevation={0} sx={{ ...cardSx, p: { xs: 2, sm: 2.5 }, mb: 2.5 }}>
        <Stepper activeStep={step - 1} alternativeLabel>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Paper>

      {step > 1 && displayOrgName && (
        <Box sx={{ mb: 2.5 }}>
          <OrgChip />
        </Box>
      )}

      <Paper elevation={0} sx={{ ...cardSx, p: { xs: 2.5, sm: 3.5 } }}>
        {step === 1 && (
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Your details
            </Typography>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Name"
                required
                value={form.name}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                onChange={(e) =>
                  setForm({ ...form, name: sanitizeNameInput(e.target.value) })
                }
                placeholder="Your full name"
                error={touched.name && !nameValid}
                helperText={touched.name && !nameValid ? nameError : " "}
                fullWidth
              />
              <TextField
                label="Mobile number"
                required
                value={form.mobile}
                onBlur={() => setTouched((t) => ({ ...t, mobile: true }))}
                onChange={(e) =>
                  setForm({
                    ...form,
                    mobile: sanitizeMobileInput(e.target.value),
                  })
                }
                placeholder="9876543210"
                slotProps={{ htmlInput: { maxLength: 10 } }}
                error={touched.mobile && !mobileValid}
                helperText={touched.mobile && !mobileValid ? mobileError : " "}
                fullWidth
              />
            </Box>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Email"
                required
                type="email"
                value={form.email}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="you@email.com"
                error={touched.email && !emailValid}
                helperText={touched.email && !emailValid ? emailError : " "}
                fullWidth
              />
              <TextField
                select
                label="Gender"
                value={form.gender}
                onChange={(e) =>
                  setForm({ ...form, gender: e.target.value as Gender })
                }
                fullWidth
              >
                <MenuItem value="">Select gender</MenuItem>
                <MenuItem value="Male">Male</MenuItem>
                <MenuItem value="Female">Female</MenuItem>
                <MenuItem value="Other">Other</MenuItem>
              </TextField>
            </Box>

            {categoriesError ? (
              <Alert
                severity="error"
                action={
                  <Button color="inherit" size="small" onClick={loadCategories}>
                    Retry
                  </Button>
                }
              >
                {categoriesError}
              </Alert>
            ) : (
              <TextField
                select
                label="Organization category"
                value={form.categoryId}
                onBlur={() => setTouched((t) => ({ ...t, categoryId: true }))}
                onChange={(e) =>
                  setForm({
                    ...form,
                    categoryId: e.target.value,
                    orgId: "",
                    serviceIds: [],
                    employeeAssignments: {},
                    date: "",
                    time: "",
                  })
                }
                error={touched.categoryId && !form.categoryId}
                helperText={
                  touched.categoryId && !form.categoryId
                    ? "Choose an organization category."
                    : " "
                }
                fullWidth
              >
                <MenuItem value="">
                  {loadingCategories
                    ? "Loading categories..."
                    : "Select a category"}
                </MenuItem>
                {categories.map((c) => (
                  <MenuItem key={c.id} value={c.id}>
                    {c.category_name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            {organizationsError ? (
              <Alert severity="error">{organizationsError}</Alert>
            ) : (
              <TextField
                select
                label="Select organization"
                value={form.orgId}
                onBlur={() => setTouched((t) => ({ ...t, orgId: true }))}
                onChange={(e) => {
                  const picked = organizations.find(
                    (o) => String(getOrgId(o)) === String(e.target.value),
                  );
                  setForm({
                    ...form,
                    orgId: e.target.value,
                    orgName: picked?.organization_name ?? "",
                    orgCategoryName: picked?.category_name ?? "",
                    serviceIds: [],
                    employeeAssignments: {},
                    date: "",
                    time: "",
                  });
                }}
                disabled={!form.categoryId}
                error={touched.orgId && !form.orgId}
                helperText={
                  touched.orgId && !form.orgId ? "Choose an organization." : " "
                }
                fullWidth
              >
                <MenuItem value="">
                  {!form.categoryId
                    ? "Choose a category first"
                    : loadingOrganizations
                      ? "Loading organizations..."
                      : organizations.length === 0
                        ? "No organizations in this category yet"
                        : "Select an organization"}
                </MenuItem>
                {organizations.map((o) => (
                  <MenuItem key={getOrgId(o)} value={getOrgId(o)}>
                    {o.organization_name}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Divider />
            <Stack direction="row" sx={{ justifyContent: "flex-end" }}>
              <Button
                variant="contained"
                size="large"
                onClick={goNext}
                endIcon={<ArrowForwardIcon fontSize="small" />}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Services & staff
            </Typography>

            {catalogError && <Alert severity="error">{catalogError}</Alert>}

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Services (select one or more)
              </Typography>
              {loadingCatalog ? (
                <Typography variant="body2" color="text.secondary">
                  Loading services...
                </Typography>
              ) : services.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No active services are set up for this organization yet.
                </Typography>
              ) : (
                <Stack spacing={1.25}>
                  {services.map((s) => {
                    const checked = form.serviceIds.includes(s.service_id);
                    const noStaff =
                      (qualifiedEmployeesByService[s.service_id] ?? [])
                        .length === 0;
                    return (
                      <Box
                        key={s.service_id}
                        onClick={() => toggleService(s.service_id)}
                        sx={{
                          display: "flex",
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "space-between",
                          rowGap: 0.75,
                          columnGap: 1.5,
                          px: 2,
                          py: 1.25,
                          borderRadius: 2,
                          border: "1px solid",
                          borderColor: checked ? "primary.main" : "divider",
                          bgcolor: checked
                            ? (theme) => alpha(theme.palette.primary.main, 0.06)
                            : "background.paper",
                          opacity: noStaff ? 0.55 : 1,
                          cursor: noStaff ? "not-allowed" : "pointer",
                          transition:
                            "border-color 0.15s ease, background-color 0.15s ease",
                          "&:hover": {
                            borderColor: noStaff
                              ? "divider"
                              : checked
                                ? "primary.main"
                                : "primary.light",
                          },
                        }}
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{ minWidth: 0, alignItems: "center" }}
                        >
                          <Checkbox
                            checked={checked}
                            disabled={noStaff}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleService(s.service_id)}
                            size="small"
                          />
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600 }}
                            noWrap
                          >
                            {s.service_name}
                          </Typography>
                        </Stack>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ ml: "auto", whiteSpace: "nowrap" }}
                        >
                          {noStaff
                            ? "No staff available"
                            : `${s.duration} min · ${formatFee(s.fee)}`}
                        </Typography>
                      </Box>
                    );
                  })}
                </Stack>
              )}
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ display: "block", mt: 1 }}
              >
                Services with no qualified staff yet are can't be
                booked.
              </Typography>
              {selectedServices.length > 0 && (
                <Typography variant="body2" sx={{ mt: 0.5, fontWeight: 600 }}>
                  {selectedServices.length} service
                  {selectedServices.length > 1 ? "s" : ""} selected ·{" "}
                  {totalDuration} min total
                  {totalFee > 0 ? ` · ${formatFee(totalFee)} total` : ""}
                </Typography>
              )}
              {form.serviceIds.length > 0 && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ mt: 1.5, alignItems: "center" }}
                >
                  <Checkbox
                    checked={pickEmployee}
                    onChange={(e) => setPickEmployee(e.target.checked)}
                    size="small"
                    id="pb-pick-employee"
                    sx={{ p: 0.5 }}
                  />
                  <Typography
                    component="label"
                    htmlFor="pb-pick-employee"
                    variant="body2"
                    sx={{ cursor: "pointer" }}
                  >
                    Select a particular employee
                  </Typography>
                </Stack>
              )}
              {form.serviceIds.length > 0 && !pickEmployee && (
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ mt: 1, color: "text.secondary", alignItems: "center" }}
                >
                  <AutoAwesomeIcon fontSize="small" />
                  <Typography variant="caption">
                    We'll assign an available, qualified staff member
                    automatically based on the time you pick
                  </Typography>
                </Stack>
              )}
            </Box>

            {pickEmployee && form.serviceIds.length > 0 && (
              <Box>
                <Stack
                  direction="row"
                  spacing={0.75}
                  sx={{ mb: 1, alignItems: "center" }}
                >
                  <ManageAccountsIcon fontSize="small" color="action" />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Staff assignment
                  </Typography>
                </Stack>
                <Paper
                  variant="outlined"
                  sx={{
                    p: 2.25,
                    borderRadius: 2,
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.03),
                  }}
                >
                  <Stack
                    direction="row"
                    spacing={0.75}
                    sx={{
                      mb: 2,
                      color: "text.secondary",
                      alignItems: "center",
                    }}
                  >
                    <AutoAwesomeIcon fontSize="small" />
                    <Typography variant="caption">
                      Assigned automatically from qualified staff - change
                      anyone you'd prefer below
                    </Typography>
                  </Stack>
                  <Stack divider={<Divider flexItem />} spacing={1.75}>
                    {selectedServices.map((s) => {
                      const options =
                        qualifiedEmployeesByService[s.service_id] ?? [];
                      return (
                        <Stack
                          key={s.service_id}
                          direction={{ xs: "column", sm: "row" }}
                          spacing={{ xs: 1, sm: 2 }}
                          sx={{
                            alignItems: { xs: "stretch", sm: "center" },
                            justifyContent: "space-between",
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, flexShrink: 0 }}
                          >
                            {s.service_name}
                          </Typography>
                          <FormControl
                            size="small"
                            sx={{
                              width: { xs: "100%", sm: 240 },
                              flexShrink: 0,
                            }}
                          >
                            <InputLabel id={`pb-staff-${s.service_id}`}>
                              Staff
                            </InputLabel>
                            <Select
                              labelId={`pb-staff-${s.service_id}`}
                              label="Staff"
                              value={
                                form.employeeAssignments[s.service_id] ?? ""
                              }
                              renderValue={(val) => {
                                if (!val) return "Unassigned";
                                const chosen = options.find(
                                  (e) => e.employee_id === val,
                                );
                                return chosen
                                  ? chosen.employee_name
                                  : "Unassigned";
                              }}
                              onChange={(e) => {
                                const val = e.target.value
                                  ? Number(e.target.value)
                                  : "";
                                setManuallyAssigned((prev) =>
                                  new Set(prev).add(s.service_id),
                                );
                                setForm((f) => ({
                                  ...f,
                                  employeeAssignments: {
                                    ...f.employeeAssignments,
                                    [s.service_id]: val,
                                  },
                                }));
                              }}
                            >
                              <MenuItem value="">Unassigned</MenuItem>
                              {options.map((e) => {
                                const ratingNum =
                                  e.rating !== null &&
                                  e.rating !== undefined &&
                                  e.rating !== ""
                                    ? typeof e.rating === "string"
                                      ? parseFloat(e.rating)
                                      : e.rating
                                    : null;
                                const hasRating =
                                  ratingNum !== null &&
                                  !Number.isNaN(ratingNum);
                                return (
                                  <MenuItem
                                    key={e.employee_id}
                                    value={e.employee_id}
                                  >
                                    <Stack sx={{ minWidth: 0 }}>
                                      <Typography variant="body2" noWrap>
                                        {e.employee_name}
                                      </Typography>
                                      {(e.shift_name || hasRating) && (
                                        <Stack
                                          direction="row"
                                          spacing={0.5}
                                          sx={{ alignItems: "center" }}
                                        >
                                          {e.shift_name && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              {e.shift_name}
                                            </Typography>
                                          )}
                                          {e.shift_name && hasRating && (
                                            <Typography
                                              variant="caption"
                                              color="text.secondary"
                                            >
                                              ·
                                            </Typography>
                                          )}
                                          {hasRating && (
                                            <Stack
                                              direction="row"
                                              spacing={0.25}
                                              sx={{ alignItems: "center" }}
                                            >
                                              <StarIcon
                                                sx={{
                                                  fontSize: 14,
                                                  color: "warning.main",
                                                }}
                                              />
                                              <Typography
                                                variant="caption"
                                                color="text.secondary"
                                              >
                                                {ratingNum!.toFixed(1)}
                                              </Typography>
                                            </Stack>
                                          )}
                                        </Stack>
                                      )}
                                    </Stack>
                                  </MenuItem>
                                );
                              })}
                            </Select>
                          </FormControl>
                        </Stack>
                      );
                    })}
                  </Stack>
                </Paper>
              </Box>
            )}

            <Divider />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                onClick={goBack}
                startIcon={<ArrowBackIcon fontSize="small" />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                size="large"
                disabled={!stepTwoValid}
                onClick={goNext}
                endIcon={<ArrowForwardIcon fontSize="small" />}
              >
                Next
              </Button>
            </Stack>
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Date &amp; time
            </Typography>

            <TextField
              label="Date"
              type="date"
              slotProps={{
                inputLabel: { shrink: true },
                htmlInput: { min: minDate },
              }}
              value={form.date}
              onChange={(e) =>
                setForm({ ...form, date: e.target.value, time: "" })
              }
              sx={{ maxWidth: 260 }}
            />

            <Box>
              <Stack
                direction="row"
                spacing={1}
                sx={{ mb: 1, alignItems: "center" }}
              >
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Time slot
                </Typography>
              </Stack>
              {!form.date ? (
                <Typography variant="body2" color="text.secondary">
                  Choose a date first.
                </Typography>
              ) : slotsLoading ? (
                <Typography variant="body2" color="text.secondary">
                  Checking availability…
                </Typography>
              ) : slotsError ? (
                <Alert
                  severity="warning"
                  icon={<WarningAmberIcon fontSize="small" />}
                >
                  {slotsError}
                </Alert>
              ) : availableTimeSlots.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No slots available on this date — try another date or service.
                </Typography>
              ) : (
                <Stack spacing={2}>
                  {(["Morning", "Afternoon", "Evening"] as const).map(
                    (period) => {
                      const slots = slotsByPeriod[period];
                      if (slots.length === 0) return null;
                      const Icon = periodIcon[period];
                      return (
                        <Box key={period}>
                          <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{
                              mb: 1,
                              color: "text.secondary",
                              alignItems: "center",
                            }}
                          >
                            <Icon fontSize="small" />
                            <Typography
                              variant="caption"
                              sx={{ fontWeight: 600 }}
                            >
                              {period}
                            </Typography>
                          </Stack>
                          <Stack
                            direction="row"
                            sx={{
                              flexWrap: "wrap",
                              rowGap: 1,
                              columnGap: 1.25,
                            }}
                          >
                            {slots.map((t) => (
                              <Chip
                                key={t}
                                label={fmt12(t)}
                                clickable
                                color={form.time === t ? "primary" : "default"}
                                variant={
                                  form.time === t ? "filled" : "outlined"
                                }
                                onClick={() => setForm({ ...form, time: t })}
                                sx={{ fontWeight: 600 }}
                              />
                            ))}
                          </Stack>
                        </Box>
                      );
                    },
                  )}
                </Stack>
              )}
            </Box>

            <Divider />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                onClick={goBack}
                startIcon={<ArrowBackIcon fontSize="small" />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                size="large"
                disabled={!stepThreeValid}
                onClick={goNext}
                endIcon={<ArrowForwardIcon fontSize="small" />}
              >
                Review
              </Button>
            </Stack>
          </Stack>
        )}

        {step === 4 && (
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Review &amp; confirm
            </Typography>

            <Box>
              <ReviewRow icon={<PersonIcon fontSize="small" />} label="Name">
                <Typography variant="body2">{form.name}</Typography>
              </ReviewRow>
              <ReviewRow icon={<PhoneIcon fontSize="small" />} label="Mobile">
                <Typography variant="body2">{form.mobile}</Typography>
              </ReviewRow>
              {form.email && (
                <ReviewRow icon={<EmailIcon fontSize="small" />} label="Email">
                  <Typography variant="body2">{form.email}</Typography>
                </ReviewRow>
              )}
              <ReviewRow
                icon={<ApartmentIcon fontSize="small" />}
                label="Organization"
              >
                <Typography variant="body2">{displayOrgName || "-"}</Typography>
              </ReviewRow>
              <ReviewRow icon={<BuildIcon fontSize="small" />} label="Services">
                <Stack
                  spacing={0.5}
                  sx={{ alignItems: { xs: "flex-start", sm: "flex-end" } }}
                >
                  {selectedServices.map((s) => {
                    const assignedEmployee = pickEmployee
                      ? employees.find(
                          (e) =>
                            e.employee_id ===
                            form.employeeAssignments[s.service_id],
                        )
                      : undefined;
                    const meta = assignedEmployee
                      ? employeeMeta(assignedEmployee)
                      : "";
                    return (
                      <Typography key={s.service_id} variant="body2">
                        {s.service_name} →{" "}
                        {pickEmployee
                          ? (assignedEmployee?.employee_name ?? "Unassigned")
                          : "Assigned automatically"}
                        {meta ? ` (${meta})` : ""} · {s.duration} min ·{" "}
                        {formatFee(s.fee)}
                      </Typography>
                    );
                  })}
                  <Typography variant="body2" sx={{ fontWeight: 700 }}>
                    Total: {totalDuration} min
                    {totalFee > 0 ? ` · ${formatFee(totalFee)}` : ""}
                  </Typography>
                </Stack>
              </ReviewRow>
              <ReviewRow
                icon={<EventAvailableIcon fontSize="small" />}
                label="Date"
              >
                <Typography variant="body2">
                  {fmtDateLong(form.date)}
                </Typography>
              </ReviewRow>
              <ReviewRow
                icon={<AccessTimeIcon fontSize="small" />}
                label="Time"
              >
                <Typography variant="body2">
                  {form.time ? fmt12(form.time) : "-"}
                </Typography>
              </ReviewRow>
            </Box>

            <TextField
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Anything the staff should know before your visit"
              multiline
              minRows={3}
              fullWidth
            />

            {submitError && (
              <Alert
                severity="error"
                icon={<WarningAmberIcon fontSize="small" />}
              >
                {submitError}
              </Alert>
            )}

            <Divider />
            <Stack direction="row" sx={{ justifyContent: "space-between" }}>
              <Button
                variant="outlined"
                color="inherit"
                size="large"
                onClick={goBack}
                disabled={submitting}
                startIcon={<ArrowBackIcon fontSize="small" />}
              >
                Back
              </Button>
              <Button
                variant="contained"
                size="large"
                onClick={submit}
                disabled={submitting}
                startIcon={<CheckCircleIcon fontSize="small" />}
              >
                {submitting ? "Booking..." : "Confirm booking"}
              </Button>
            </Stack>
          </Stack>
        )}
      </Paper>
    </PageShell>
  );
};
export default BookAppointment;
