import { useEffect, useRef, useState } from "react";
import { Box, Card, Typography, Stack, Chip, CircularProgress, alpha } from "@mui/material";
import {
  FiberManualRecord as DotIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  AccessTime as ClockIcon,
  Autorenew as InProgressIcon,
} from "@mui/icons-material";
import { getEmployeeSchedule, getMyQueue } from "../../services/employeeService";

interface ShiftDetails {
  shift_name: string;
  start_time: string;
  end_time: string;
  break_start?: string | null;
  break_end?: string | null;
  status: string;
}

interface AppointmentToday {
  appointment_id: number;
  time: string;
  customer_name: string;
  service_name: string;
  appointment_status: string;
  service_status: string;
}

interface ScheduleData {
  shift: ShiftDetails | null;
  appointments_today: AppointmentToday[];
}
const CONTENT_KEYFRAMES = {
  "@keyframes pageFadeUp": {
    from: { opacity: 0, transform: "translateY(16px)" },
    to: { opacity: 1, transform: "translateY(0)" },
  },
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WORKING_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

const toTimeLabel = (totalMinutes: number) => {
  let h = Math.floor(totalMinutes / 60) % 24;
  const m = totalMinutes % 60;
  const suffix = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
};

const formatTime = (t: string) => toTimeLabel(toMinutes(t));

const statusInfo = (row: AppointmentToday): { text: string; color: "success" | "info" | "default" | "error" | "warning" } => {
  if (row.service_status === "Completed" || row.appointment_status === "Completed") {
    return { text: "Completed", color: "success" };
  }
  if (row.appointment_status === "In Progress") {
    return { text: "In Progress (Current Customer)", color: "info" };
  }
  if (row.appointment_status === "Left Queue") {
    return { text: "Left Queue", color: "default" };
  }
  if (row.appointment_status === "Cancelled") {
    return { text: "Cancelled", color: "error" };
  }
  if (row.appointment_status === "No Show") {
    return { text: "No Show", color: "error" };
  }
  return { text: "Waiting", color: "warning" };
};

const panelSx = {
  p: 3,
  borderRadius: 3,
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 1px 2px rgba(14,60,97,0.06)",
};

export default function MySchedule() {
  const employeeId = localStorage.getItem("employee_id");

  const [data, setData] = useState<ScheduleData | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [inProgressCount, setInProgressCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState(new Date());
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  const initialLoadRef = useRef(false);

  useEffect(() => {
    if (!initialLoadRef.current) {
      initialLoadRef.current = true;
      load();
    }
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const load = async () => {
    try {
      const [scheduleRes, queueRes] = await Promise.all([getEmployeeSchedule(employeeId!), getMyQueue(employeeId!)]);
      setData(scheduleRes.data.data);
      setWaitingCount(
        queueRes.data.pagination?.total_records ?? queueRes.data.data.next_waiting_customers.length
      );
      setInProgressCount(queueRes.data.data.current_customer ? 1 : 0);
      setScheduleError(null);
    } catch (error) {
      console.error("Failed to load employee schedule:", error);
      setScheduleError("Couldn't load your schedule. Check your connection and refresh.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "60vh" }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (scheduleError) {
    return (
      <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          My Schedule
        </Typography>
        <Typography color="error">{scheduleError}</Typography>
      </Box>
    );
  }

  if (!data || !data.shift) {
    return (
      <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5 }}>
        <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
          My Schedule
        </Typography>
        <Typography color="text.secondary">
          No shift has been assigned to your account yet. Contact your organization admin.
        </Typography>
      </Box>
    );
  }

  const shift = data.shift;
  const startMin = toMinutes(shift.start_time);
  const endMin = toMinutes(shift.end_time);
  const hasBreak = Boolean(shift.break_start && shift.break_end);
  const firstBlockEnd = hasBreak ? toMinutes(shift.break_start as string) : endMin;
  const secondBlockStart = hasBreak ? toMinutes(shift.break_end as string) : endMin;

  const todayName = DAYS[now.getDay()];

  const STAT_COLORS = {
    shift: "#0F766E",
    statusActive: "#16A34A",
    statusInactive: "#64748B",
    waiting: "#D97706",
    inProgress: "#0284C7",
  };

  const statCards = [
    {
      label: "Today's Shift",
      value: `${formatTime(shift.start_time)} - ${formatTime(shift.end_time)}`,
      color: STAT_COLORS.shift,
      icon: <ScheduleIcon fontSize="small" />,
    },
    {
      label: "Shift Status",
      value: shift.status,
      color: shift.status === "Active" ? STAT_COLORS.statusActive : STAT_COLORS.statusInactive,
      icon: <CheckCircleIcon fontSize="small" />,
    },
    {
      label: "Waiting",
      value: String(waitingCount),
      color: STAT_COLORS.waiting,
      icon: <ClockIcon fontSize="small" />,
    },
    {
      label: "In Progress",
      value: String(inProgressCount),
      color: STAT_COLORS.inProgress,
      icon: <InProgressIcon fontSize="small" />,
    },
  ];

  return (
    <Box sx={{ px: { xs: 2, md: 4 }, py: 3.5, ...CONTENT_KEYFRAMES, animation: "pageFadeUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards" }}>
      <Stack spacing={3}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          sx={{ justifyContent: { sm: "space-between" }, alignItems: { xs: "flex-start", sm: "center" } }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }} gutterBottom>
              My Schedule
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Weekly working hours, breaks and weekly offs — {shift.shift_name} ({formatTime(shift.start_time)} -{" "}
              {formatTime(shift.end_time)}).
            </Typography>
          </Box>

          <Chip
            icon={<DotIcon sx={{ fontSize: "10px !important", color: "success.main" }} />}
            label={`Live • ${now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`}
            variant="outlined"
            sx={{ fontWeight: 600, borderColor: "success.light", bgcolor: "success.light", color: "success.dark" }}
          />
        </Stack>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2 }}>
          {statCards.map((s) => (
            <Card
              key={s.label}
              elevation={0}
              sx={{
                ...panelSx,
                p: 2.25,
                display: "flex",
                alignItems: "center",
                gap: 2,
              }}
            >
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  bgcolor: alpha(s.color, 0.12),
                  color: s.color,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ color: "text.primary", fontWeight: 700 }}>
                  {s.value}
                </Typography>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, letterSpacing: "0.02em" }}>
                  {s.label}
                </Typography>
              </Box>
            </Card>
          ))}
        </Box>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)", lg: "repeat(7, 1fr)" }, gap: 2 }}>
          {DAYS.slice(1)
            .concat(DAYS[0])
            .map((day) => {
              const isToday = day === todayName;
              const isOff = !WORKING_DAYS.includes(day);

              return (
                <Card
                  key={day}
                  elevation={0}
                  sx={{
                    ...panelSx,
                    p: 2,
                    borderColor: isToday ? "primary.main" : "divider",
                    boxShadow: isToday ? "0 6px 18px rgba(14,165,233,0.18)" : panelSx.boxShadow,
                  }}
                >
                  <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {day}
                    </Typography>
                    {isToday && <Chip label="TODAY" size="small" color="primary" sx={{ fontWeight: 700, fontSize: 10, height: 20 }} />}
                    {isOff && <Chip label="OFF" size="small" sx={{ fontWeight: 700, fontSize: 10, height: 20 }} />}
                  </Stack>

                  {isOff ? (
                    <Typography variant="caption" color="text.secondary">
                      Day off
                    </Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      <Box sx={{ px: 1, py: 0.75, borderRadius: 1.5, bgcolor: "success.light", color: "success.dark", fontSize: 12, fontWeight: 600, display: hasBreak ? undefined : "flex", alignItems: "center", gap: 0.5 }}>
                        {!hasBreak && isToday && <DotIcon sx={{ fontSize: "8px !important", color: "success.main" }} />}
                        {toTimeLabel(startMin)} - {toTimeLabel(firstBlockEnd)}
                      </Box>
                      {hasBreak && (
                        <>
                          <Box sx={{ px: 1, py: 0.75, borderRadius: 1.5, bgcolor: "warning.light", color: "warning.dark", fontSize: 12, fontWeight: 600 }}>
                            Break {toTimeLabel(firstBlockEnd)} - {toTimeLabel(secondBlockStart)}
                          </Box>
                          <Box sx={{ px: 1, py: 0.75, borderRadius: 1.5, bgcolor: "success.light", color: "success.dark", fontSize: 12, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
                            {isToday && <DotIcon sx={{ fontSize: "8px !important", color: "success.main" }} />}
                            {toTimeLabel(secondBlockStart)} - {toTimeLabel(endMin)}
                          </Box>
                        </>
                      )}
                    </Stack>
                  )}
                </Card>
              );
            })}
        </Box>

        <Card elevation={0} sx={panelSx}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              Today's Appointments ({data.appointments_today.length})
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Updated {now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
            </Typography>
          </Stack>

          {data.appointments_today.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
              No appointments scheduled for today.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {data.appointments_today.map((row) => {
                const info = statusInfo(row);
                return (
                  <Box
                    key={row.appointment_id}
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: 1.5,
                      py: 1.25,
                      borderRadius: 2,
                      bgcolor: "background.default",
                    }}
                  >
                    <Box sx={{ minWidth: 0, display: "flex", alignItems: "center", gap: 1 }}>
                      {row.appointment_status === "In Progress" && <DotIcon sx={{ fontSize: "10px !important", color: "info.main" }} />}
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
                          {row.customer_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {row.service_name}
                        </Typography>
                      </Box>
                    </Box>
                    <Stack sx={{ alignItems: "flex-end", flexShrink: 0, pl: 1 }} spacing={0.5}>
                      <Typography variant="caption" sx={{ fontWeight: 700 }}>
                        {formatTime(row.time)}
                      </Typography>
                      <Chip label={info.text} size="small" color={info.color} variant={info.color === "default" ? "outlined" : "filled"} sx={{ fontWeight: 600, fontSize: 11, height: 20 }} />
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </Card>
      </Stack>
    </Box>
  );
}