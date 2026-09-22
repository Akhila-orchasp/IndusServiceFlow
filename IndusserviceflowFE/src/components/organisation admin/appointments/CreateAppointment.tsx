import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import {
  Box,
  Typography,
  Card,
  Stack,
  TextField,
  MenuItem,
  Button,
  Stepper,
  Step,
  StepLabel,
  ToggleButtonGroup,
  ToggleButton,
  Checkbox,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Divider,
  Alert,
  Avatar,
  alpha,
} from "@mui/material";
import {
  Person as PersonIcon,
  Phone as PhoneIcon,
  Email as EmailIcon,
  Build as BuildIcon,
  ManageAccounts as ManageAccountsIcon,
  EventAvailable as EventAvailableIcon,
  AccessTime as AccessTimeIcon,
  Check as CheckIcon,
  SupportAgent as SupportAgentIcon,
  Event as EventIcon,
  StickyNote2 as StickyNoteIcon,
  AutoAwesome as AutoAwesomeIcon,
  WarningAmber as WarningAmberIcon,
  WbSunny as WbSunnyIcon,
  WbTwilight as WbTwilightIcon,
  Bedtime as BedtimeIcon,
  Download as DownloadIcon,
  Apartment as ApartmentIcon,
  Tag as TagIcon,
  ConfirmationNumber as ConfirmationNumberIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
} from "@mui/icons-material";

import {
  createAppointment,
  getAppointmentType,
  getAvailableSlotsForAssignments,
  getAvailableSlotsForServices,
  type CreateAppointmentServiceItem,
  type Appointment,
} from "../../../services/appointmentService";
import {
  getOrgServices,
  getOrgEmployees,
  getEmployeeServiceLinks,
  type CatalogService,
  type CatalogEmployee,
  type EmployeeServiceLink,
} from "../../../services/catalogService";

import {
  getMobileError,
  getEmailError,
  getNameError,
} from "../../../utils/validators";

type BookingType = "Scheduled" | "Walk-in";
type Gender = "Male" | "Female" | "Other";
type Step = 1 | 2 | 3;

const CATALOG_SYNC_MS = 45_000;

const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "Customer" },
  { id: 2, label: "Services & staff" },
  { id: 3, label: "Schedule & notes" },
];

const emptyForm = {
  name: "",
  mobile: "",
  email: "",
  gender: "" as Gender | "",
  bookingType: "Scheduled" as BookingType,
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

const cardSx = {
  borderRadius: 3,
  bgcolor: "background.paper",
  boxShadow: "0 4px 14px rgba(15,23,42,0.06)",
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

const CreateAppointment = ({
  embedded = false,
  onClose,
  onBooked,
}: {
  embedded?: boolean;
  onClose?: () => void;
  onBooked?: () => void;
} = {}) => {
  const navigate = useNavigate();
  const orgId = localStorage.getItem("org_id") || undefined;
  const orgName = localStorage.getItem("org_name") || "your organization";

  const handleClose = () => {
    if (onClose) onClose();
    else navigate("/org-admin/appointments");
  };

  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState(emptyForm);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [services, setServices] = useState<CatalogService[]>([]);
  const [employees, setEmployees] = useState<CatalogEmployee[]>([]);
  const [links, setLinks] = useState<EmployeeServiceLink[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [slotJustReleased, setSlotJustReleased] = useState(false);
  const [confirmed, setConfirmed] = useState<Appointment | null>(null);
  const [confirmedMeta, setConfirmedMeta] = useState<{
    bookingType: BookingType;
    notes: string;
  } | null>(null);
  const [manuallyAssigned, setManuallyAssigned] = useState<Set<number>>(
    new Set(),
  );
  const [pickEmployee, setPickEmployee] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const silentRefreshCatalog = async () => {
    try {
      const [svcRes, empRes, linkRes] = await Promise.all([
        getOrgServices(orgId),
        getOrgEmployees(orgId),
        getEmployeeServiceLinks(),
      ]);
      setServices(Array.isArray(svcRes.data) ? svcRes.data : []);
      setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
      setLinks(Array.isArray(linkRes.data) ? linkRes.data : []);
      setCatalogError(null);
    } catch {}
  };

  useEffect(() => {
    let cancelled = false;
    setLoadingCatalog(true);
    setCatalogError(null);

    Promise.all([
      getOrgServices(orgId),
      getOrgEmployees(orgId),
      getEmployeeServiceLinks(),
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
            "Couldn't load services and staff. Please refresh and try again.",
          );
      })
      .finally(() => {
        if (!cancelled) setLoadingCatalog(false);
      });

    return () => {
      cancelled = true;
    };
  }, [orgId]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!confirmed) silentRefreshCatalog();
    }, CATALOG_SYNC_MS);
    return () => clearInterval(id);
  }, [orgId, confirmed]);

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
  }, [pickEmployee, form.serviceIds, qualifiedEmployeesByService]);

  const toggleService = (id: number) => {
    const alreadySelected = form.serviceIds.includes(id);
    const qualified = (qualifiedEmployeesByService[id] ?? []).length > 0;
    // Allow de-selecting a service regardless (e.g. staff got unassigned
    // after it was picked), but never allow selecting a service that has
    // no qualified/active staff assigned to it.
    if (!alreadySelected && !qualified) return;
    setForm((f) => ({
      ...f,
      serviceIds: alreadySelected
        ? f.serviceIds.filter((x) => x !== id)
        : [...f.serviceIds, id],
    }));
  };

  const minDate = dateKey(now);
  const isToday = form.date === minDate;
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const assignmentsForSlots = useMemo(() => {
    if (!pickEmployee) return null;
    if (!form.serviceIds.length) return null;

    const assignments: { service_id: number; employee_id: number }[] = [];

    for (const sid of form.serviceIds) {
      const empId = form.employeeAssignments[sid];
      if (!empId) return null;
      assignments.push({ service_id: sid, employee_id: empId });
    }

    return assignments;
  }, [pickEmployee, form.serviceIds, form.employeeAssignments]);

  const [fetchedSlots, setFetchedSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !form.date || form.serviceIds.length === 0) {
      setFetchedSlots([]);
      setSlotsError(null);
      return;
    }

    const request = pickEmployee
      ? assignmentsForSlots
        ? getAvailableSlotsForAssignments(orgId, form.date, assignmentsForSlots)
        : null
      : getAvailableSlotsForServices(orgId, form.date, form.serviceIds);

    if (!request) {
      setFetchedSlots([]);
      setSlotsError(null);
      return;
    }

    let cancelled = false;
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
    orgId,
    form.date,
    pickEmployee,
    JSON.stringify(form.serviceIds),
    JSON.stringify(assignmentsForSlots),
  ]);

  const availableTimeSlots = useMemo(() => {
    if (!isToday) return fetchedSlots;
    return fetchedSlots.filter((t) => timeToMin(t) > nowMin);
  }, [fetchedSlots, isToday, nowMin]);

  useEffect(() => {
    if (form.time && isToday && timeToMin(form.time) <= nowMin) {
      setForm((f) => ({ ...f, time: "" }));
      setSlotJustReleased(true);
    }
  }, [nowMin, isToday, form.time]);

  useEffect(() => {
    if (form.time && !slotsLoading && !availableTimeSlots.includes(form.time)) {
      setForm((f) => ({ ...f, time: "" }));
      setSlotJustReleased(true);
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

  const mobileDigits = form.mobile.trim();
  const nameError = getNameError(form.name, "Customer name");
  const mobileError = getMobileError(mobileDigits);
  const emailError = getEmailError(form.email.trim());
  const nameValid = !nameError;
  const mobileValid = !mobileError;
  const emailValid = !emailError;

  const customerValid = nameValid && mobileValid && emailValid;
  const servicesValid = form.serviceIds.length > 0;
  const scheduleValid = !!form.date && !!form.time;
  const formValid = customerValid && servicesValid && scheduleValid;

  const stepValid: Record<Step, boolean> = {
    1: customerValid,
    2: servicesValid,
    3: scheduleValid,
  };

  const goNext = () => {
    if (step === 1) {
      setTouched((t) => ({ ...t, name: true, mobile: true, email: true }));
      if (!customerValid) return;
    }
    if (step === 2 && !servicesValid) return;
    setStep((s) => (s < 3 ? ((s + 1) as Step) : s));
  };

  const goBack = () => {
    setStep((s) => (s > 1 ? ((s - 1) as Step) : s));
  };

  const submit = async () => {
    if (!orgId) {
      setSubmitError(
        "No organization is selected for this session. Please log in again.",
      );
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    const remarks =
      form.bookingType === "Walk-in"
        ? `Walk-in${form.notes.trim() ? ` - ${form.notes.trim()}` : ""}`
        : form.notes.trim();

    const servicesPayload: CreateAppointmentServiceItem[] = form.serviceIds.map(
      (sid) => ({
        service_id: sid,
        employee_id: pickEmployee
          ? form.employeeAssignments[sid] || undefined
          : undefined,
      }),
    );

    try {
      const res = await createAppointment({
        org_id: orgId,
        customer_name: form.name.trim(),
        mobile: form.mobile.trim(),
        email: form.email.trim(),
        gender: form.gender || undefined,
        date: form.date,
        time: `${form.time}:00`,
        remarks,
        services: servicesPayload,
      });

      setConfirmed(res.data.data);
      setConfirmedMeta({
        bookingType: form.bookingType,
        notes: form.notes.trim(),
      });
      onBooked?.();
    } catch (err: any) {
      const isConflict = err?.response?.status === 409;
      const message =
        err?.response?.data?.message ||
        (isConflict
          ? "That slot was just taken by another booking. Pick a new time below — the schedule has been refreshed."
          : "Couldn't book this appointment. Please check the details and try again.");
      setSubmitError(message);
      if (isConflict) {
        setForm((f) => ({ ...f, time: "" }));
        silentRefreshCatalog();
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setTouched((t) => ({ ...t, name: true, mobile: true, email: true }));
    if (!formValid) return;
    submit();
  };

  const bookAnother = () => {
    setForm(emptyForm);
    setTouched({});
    setManuallyAssigned(new Set());
    setConfirmed(null);
    setConfirmedMeta(null);
    setStep(1);
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

  const fmtTimeLong = (t: string | null | undefined) => {
    if (!t) return "-";
    return fmt12(t.slice(0, 5));
  };

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

  const downloadReceipt = (
    appt: Appointment,
    meta: { bookingType: BookingType; notes: string } | null,
  ) => {
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const marginX = 40;
    const contentWidth = pageWidth - marginX * 2;
    const HEADER_H = 92;
    const FOOTER_H = 58;
    let y = 0;

    const generatedAt = new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    // ── Header banner (navy + teal accent strip) ──────────────────────
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
          s.employee_name ?? "Unassigned",
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

      // Totals
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
    infoRow("Type", meta?.bookingType ?? getAppointmentType(appt));
    infoRow("Date", fmtDateLong(appt.date));
    infoRow("Time", fmtTimeLong(appt.time));
    infoRow("Booked on", fmtDateTimeLong(appt.created_on));

    sectionHeading("Services");
    drawServicesTable();

    if (meta?.notes) {
      sectionHeading("Notes");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(...RECEIPT_INK);
      const wrapped = doc.splitTextToSize(meta.notes, contentWidth);
      ensureSpace(wrapped.length * 13);
      doc.text(wrapped, marginX, y);
      y += wrapped.length * 13 + 8;
    }

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

    const totalPages = doc.internal.pages.length - 1;
    for (let p = 1; p <= totalPages; p += 1) {
      doc.setPage(p);
      drawFooter(p, totalPages);
    }

    doc.save(`receipt-${appt.appointment_number}.pdf`);
  };
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

  if (confirmed) {
    const bookingType =
      confirmedMeta?.bookingType ?? getAppointmentType(confirmed);

    return (
      <Box sx={{ px: { xs: 2, md: 4 }, py: 4, maxWidth: 640, mx: "auto" }}>
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
            Appointment booked
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Confirmed for {confirmed.customer_name}
          </Typography>
        </Stack>

        <Card
          elevation={0}
          sx={{ ...cardSx, p: { xs: 2.5, sm: 3.5 } }}
          id="oaf-receipt-printable"
        >
          <Stack
            direction="row"
            sx={{
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2.5,
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <ApartmentIcon fontSize="small" color="action" />
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                {orgName}
              </Typography>
            </Stack>
            <Chip
              size="small"
              label={confirmed.status}
              color="success"
              sx={{ fontWeight: 600 }}
            />
          </Stack>

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
                sx={{ alignItems: "center", color: "text.secondary", mb: 0.25 }}
                component="div"
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
                sx={{ alignItems: "center", color: "text.secondary", mb: 0.25 }}
                component="div"
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

          <ReviewRow icon={<PersonIcon fontSize="small" />} label="Customer">
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {confirmed.customer_name}
            </Typography>
          </ReviewRow>
          <ReviewRow icon={<PhoneIcon fontSize="small" />} label="Mobile">
            <Typography variant="body2">{confirmed.customer_mobile}</Typography>
          </ReviewRow>
          {confirmed.customer_email && (
            <ReviewRow icon={<EmailIcon fontSize="small" />} label="Email">
              <Typography variant="body2">
                {confirmed.customer_email}
              </Typography>
            </ReviewRow>
          )}
          <ReviewRow
            icon={
              bookingType === "Walk-in" ? (
                <SupportAgentIcon fontSize="small" />
              ) : (
                <EventIcon fontSize="small" />
              )
            }
            label="Type"
          >
            <Typography variant="body2">{bookingType}</Typography>
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
              {fmtTimeLong(confirmed.time)}
            </Typography>
          </ReviewRow>
          <ReviewRow icon={<BuildIcon fontSize="small" />} label="Services">
            <Stack
              spacing={0.5}
              sx={{ alignItems: { xs: "flex-start", sm: "flex-end" } }}
            >
              {confirmed.services.map((s) => (
                <Typography key={s.appointment_service_id} variant="body2">
                  {s.service_name} → {s.employee_name ?? "Unassigned"} ·{" "}
                  {s.duration_min} min · {formatFee(s.fee)}
                </Typography>
              ))}
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Total: {confirmed.total_duration_min} min ·{" "}
                {formatFee(confirmed.total_fee)}
              </Typography>
            </Stack>
          </ReviewRow>
          {confirmedMeta?.notes && (
            <ReviewRow icon={<StickyNoteIcon fontSize="small" />} label="Notes">
              <Typography variant="body2">{confirmedMeta.notes}</Typography>
            </ReviewRow>
          )}

          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ display: "block", mt: 2.5 }}
          >
            Please arrive 10 minutes before your scheduled time. Booked on{" "}
            {fmtDateTimeLong(confirmed.created_on)}.
          </Typography>
        </Card>

        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            color="inherit"
            size="medium"
            startIcon={<DownloadIcon fontSize="small" />}
            onClick={() => downloadReceipt(confirmed, confirmedMeta)}
            sx={{ flexShrink: 0 }}
          >
            Download receipt
          </Button>
          <Button
            variant="outlined"
            color="inherit"
            size="medium"
            fullWidth
            onClick={handleClose}
          >
            Back to appointments
          </Button>
          <Button
            variant="contained"
            size="medium"
            fullWidth
            onClick={bookAnother}
          >
            Book another appointment
          </Button>
        </Stack>
      </Box>
    );
  }

  const formBody = (
    <>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          px: { xs: 2.5, sm: 3.5 },
          pt: 3,
          pb: 2.5,
        }}
      >
        <Stack direction="row" spacing={1.75} sx={{ alignItems: "center" }}>
          <Avatar
            variant="rounded"
            sx={{
              width: 44,
              height: 44,
              borderRadius: 2.5,
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12),
              color: "primary.main",
            }}
          >
            <EventIcon />
          </Avatar>
          <Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontFamily: "'Sora', sans-serif",
                lineHeight: 1.25,
              }}
            >
              New appointment
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Book a scheduled or walk-in appointment for {orgName}.
            </Typography>
          </Box>
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 3 }}>
        <Stepper activeStep={step - 1} sx={{ mb: 1 }}>
          {STEPS.map((s) => (
            <Step key={s.id}>
              <StepLabel>{s.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      {catalogError && (
        <Box sx={{ px: { xs: 2.5, sm: 3.5 }, mt: 2 }}>
          <Alert severity="error">{catalogError}</Alert>
        </Box>
      )}

      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 3 }}
      >
        {step === 1 && (
          <Stack spacing={3}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <PersonIcon fontSize="small" color="action" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Customer details
              </Typography>
            </Stack>
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
                gap: 2.5,
              }}
            >
              <TextField
                label="Full name"
                value={form.name}
                onBlur={() => setTouched((t) => ({ ...t, name: true }))}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  setTouched((t) => ({ ...t, name: true }));
                }}
                placeholder="e.g. Aishwarya Menon"
                error={touched.name && !nameValid}
                helperText={touched.name && !nameValid ? nameError : " "}
                fullWidth
              />
              <TextField
                label="Mobile"
                type="tel"
                value={form.mobile}
                onBlur={() => setTouched((t) => ({ ...t, mobile: true }))}
                onChange={(e) => {
                  setForm({ ...form, mobile: e.target.value });
                  setTouched((t) => ({ ...t, mobile: true }));
                }}
                placeholder="9876543210"
                inputMode="numeric"
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
                type="email"
                value={form.email}
                onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                onChange={(e) => {
                  setForm({ ...form, email: e.target.value });
                  setTouched((t) => ({ ...t, email: true }));
                }}
                placeholder="customer@email.com"
                error={touched.email && !emailValid}
                helperText={touched.email && !emailValid ? emailError : " "}
                fullWidth
              />
              <TextField
                select
                label="Gender (optional)"
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

            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                Booking type
              </Typography>
              <ToggleButtonGroup
                exclusive
                value={form.bookingType}
                onChange={(_, val) =>
                  val && setForm({ ...form, bookingType: val })
                }
                color="primary"
                sx={{ "& .MuiToggleButton-root": { px: 3, py: 1 } }}
              >
                <ToggleButton value="Scheduled">
                  <EventIcon fontSize="small" sx={{ mr: 1 }} /> Scheduled
                </ToggleButton>
                <ToggleButton value="Walk-in">
                  <SupportAgentIcon fontSize="small" sx={{ mr: 1 }} /> Walk-in
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Stack>
        )}

        {step === 2 && (
          <Stack spacing={3}>
            <Box>
              <Stack
                direction="row"
                spacing={1}
                sx={{ alignItems: "center", mb: 1.5 }}
              >
                <BuildIcon fontSize="small" color="action" />
                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                  Select one or more services
                </Typography>
              </Stack>
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
                          opacity: noStaff && !checked ? 0.55 : 1,
                          cursor: noStaff && !checked ? "not-allowed" : "pointer",
                          transition:
                            "border-color 0.15s ease, background-color 0.15s ease",
                          "&:hover": {
                            borderColor:
                              noStaff && !checked
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
                            disabled={noStaff && !checked}
                            onClick={(e) => e.stopPropagation()}
                            onChange={() => toggleService(s.service_id)}
                            size="small"
                          />
                          <Box sx={{ minWidth: 0 }}>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600 }}
                              noWrap
                            >
                              {s.service_name}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {s.service_type_name}
                            </Typography>
                          </Box>
                        </Stack>
                        <Stack
                          direction="row"
                          spacing={1}
                          sx={{
                            flexShrink: 0,
                            ml: "auto",
                            alignItems: "center",
                          }}
                        >
                          {noStaff && (
                            <Chip
                              size="small"
                              color="warning"
                              variant="outlined"
                              icon={<WarningAmberIcon fontSize="small" />}
                              label="No qualified staff"
                            />
                          )}
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ whiteSpace: "nowrap" }}
                          >
                            {s.duration} min · {formatFee(s.fee)}
                          </Typography>
                        </Stack>
                      </Box>
                    );
                  })}
                </Stack>
              )}
              {selectedServices.length > 0 && (
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ mt: 1 }}
                >
                  {selectedServices.length} service
                  {selectedServices.length > 1 ? "s" : ""} selected ·{" "}
                  {totalDuration} min total
                  {totalFee > 0 ? ` · ${formatFee(totalFee)} total` : ""}
                </Typography>
              )}
              {touched.services && !servicesValid && (
                <Typography
                  variant="caption"
                  color="error"
                  sx={{ display: "block", mt: 0.5 }}
                >
                  Select at least one service to continue.
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
                    id="ca-pick-employee"
                    sx={{ p: 0.5 }}
                  />
                  <Typography
                    component="label"
                    htmlFor="ca-pick-employee"
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
                    automatically based on the time picked
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
                <Card
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
                      alignItems: "center",
                      color: "text.secondary",
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
                            <InputLabel id={`staff-${s.service_id}`}>
                              Staff
                            </InputLabel>
                            <Select
                              labelId={`staff-${s.service_id}`}
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
                                  ? `${chosen.employee_name} (${chosen.designation})`
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
                                const meta = employeeMeta(e);
                                return (
                                  <MenuItem
                                    key={e.employee_id}
                                    value={e.employee_id}
                                  >
                                    <Stack sx={{ minWidth: 0 }}>
                                      <Typography variant="body2" noWrap>
                                        {e.employee_name} ({e.designation})
                                      </Typography>
                                      {meta && (
                                        <Typography
                                          variant="caption"
                                          color="text.secondary"
                                        >
                                          {meta}
                                        </Typography>
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
                </Card>
              </Box>
            )}
          </Stack>
        )}

        {step === 3 && (
          <Stack spacing={3}>
            <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
              <EventAvailableIcon fontSize="small" color="action" />
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                Schedule & notes
              </Typography>
            </Stack>

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
                sx={{ alignItems: "center", mb: 1.5 }}
              >
                <AccessTimeIcon fontSize="small" color="action" />
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Time slot
                </Typography>
                {isToday && (
                  <Chip
                    size="small"
                    color="success"
                    label="live"
                    sx={{ height: 20, fontSize: 11 }}
                  />
                )}
              </Stack>
              {slotJustReleased && (
                <Alert severity="warning" sx={{ mb: 1.5 }}>
                  Your selected time just passed — pick another slot.
                </Alert>
              )}
              {!form.date ? (
                <Typography variant="body2" color="text.secondary">
                  Choose a date first.
                </Typography>
              ) : slotsLoading ? (
                <Typography variant="body2" color="text.secondary">
                  Checking staff availability…
                </Typography>
              ) : slotsError ? (
                <Alert severity="warning">{slotsError}</Alert>
              ) : availableTimeSlots.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No slots available for the assigned staff on this date — try
                  another date or employee.
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
                            sx={{ flexWrap: "wrap", gap: 1.25, rowGap: 1 }}
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
                                onClick={() => {
                                  setForm({ ...form, time: t });
                                  setSlotJustReleased(false);
                                }}
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

            <TextField
              label="Notes (optional)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Anything the front desk or assigned staff should know"
              multiline
              minRows={3}
              fullWidth
            />
          </Stack>
        )}

        {submitError && (
          <Alert severity="error" sx={{ mt: 2.5 }}>
            {submitError}
          </Alert>
        )}

        <Divider sx={{ mt: 4 }} />
        <Stack
          direction="row"
          sx={{
            justifyContent: step === 1 ? "flex-end" : "space-between",
            pt: 2.5,
            pb: 3.5,
          }}
        >
          {step > 1 && (
            <Button
              variant="outlined"
              color="inherit"
              size="medium"
              onClick={goBack}
              disabled={submitting}
              startIcon={<ArrowBackIcon fontSize="small" />}
            >
              Back
            </Button>
          )}

          {step < 3 ? (
            <Button
              variant="contained"
              size="medium"
              onClick={goNext}
              disabled={!stepValid[step]}
              endIcon={<ArrowForwardIcon fontSize="small" />}
            >
              Next
            </Button>
          ) : (
            <Button
              type="submit"
              variant="contained"
              size="medium"
              disabled={submitting || !formValid}
            >
              {submitting ? "Booking..." : "Book appointment"}
            </Button>
          )}
        </Stack>
      </Box>
    </>
  );

  if (embedded) {
    return <Box>{formBody}</Box>;
  }

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
      <Card
        elevation={0}
        sx={{ ...cardSx, maxWidth: 780, mx: "auto", overflow: "hidden" }}
      >
        {formBody}
      </Card>
    </Box>
  );
};

export default CreateAppointment;