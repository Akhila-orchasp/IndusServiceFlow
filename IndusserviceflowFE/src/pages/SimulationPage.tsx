import { useEffect, useState, useMemo } from "react";

import {
  Box,
  Button,
  Card,
  CardContent,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

import {
  PeopleAlt as PeopleAltIcon,
  CheckCircle as CheckCircleIcon,
  HourglassBottom as HourglassBottomIcon,
  PersonOff as PersonOffIcon,
  AccessTime as AccessTimeIcon,
  Schedule as ScheduleIcon,
  Hotel as HotelIcon,
  TrendingUp as TrendingUpIcon,
  MoreVert as MoreVertIcon,
  PictureAsPdf as PictureAsPdfIcon,
  TableView as TableViewIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";

import { useSimulation } from "../context/SimulationContext";

import { useRunSimulation } from "../hooks/useSimulation";

import { simulationApi } from "../api/simulationApi";
import { parseBlobErrorMessage } from "../services/api";

import { useAuth } from "../context/AuthContext";

import TrendChart from "../components/simulation/TrendChart";

import ForecastChart from "../components/simulation/ForecastChart";

import { formatDate, statusColor } from "../utils/formatters";

import toast from "react-hot-toast";

import type {
  SimulationFormData,
  SimulationDashboard,
  SimulationResult,
} from "../types";

/* =========================================================
   COLORS
========================================================= */

const TEAL = "#0d9488";

/* =========================================================
   DARK MODE
========================================================= */

function useDark() {
  const [dark, setDark] = useState(
    () => document.documentElement.getAttribute("data-theme") === "dark",
  );

  useEffect(() => {
    const obs = new MutationObserver(() =>
      setDark(document.documentElement.getAttribute("data-theme") === "dark"),
    );

    obs.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });

    return () => obs.disconnect();
  }, []);

  return dark;
}

/* =========================================================
   LIVE RESULT
========================================================= */

interface LiveResult {
  waitForNext: string;
  waitForCustomerN: string;
  utilization: string;
  overloaded: boolean;
  effectiveServiceRate: string;
}

/* =========================================================
   DOCTOR WAIT CALCULATION
========================================================= */

function calcDoctorWait(
  form: SimulationFormData,
  doctors: number,
  customers: string,
): string {
  const n = parseInt(customers);

  if (!n || n < 1) return "0";

  const serviceRate = form.service_probability * doctors;

  const rhoTotal = form.arrival_probability / serviceRate;

  if (rhoTotal >= 1) return "∞";

  const waitTime =
    (form.arrival_probability /
      serviceRate /
      (form.service_probability * doctors * (1 - rhoTotal))) *
    60;

  return Math.max(0, waitTime * (n - 1)).toFixed(1);
}

/* =========================================================
   SLIDER ROW
========================================================= */

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
  integer,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  integer?: boolean;
}) {
  return (
    <Box sx={{ mb: 2 }}>
      <Stack direction="row" sx={{ mb: 0.75, justifyContent: "space-between" }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 600,
            color: "#64748b",
            letterSpacing: "0.05em",
          }}
        >
          {label}:{" "}
          <Box
            component="span"
            sx={{
              color: "#0f172a",
              fontWeight: 700,
            }}
          >
            {value}
          </Box>
        </Typography>
      </Stack>

      <Box
        component="input"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) =>
          onChange(
            integer ? parseInt(e.target.value) : parseFloat(e.target.value),
          )
        }
        sx={{
          width: "100%",
          height: 4,
          accentColor: TEAL,
        }}
      />
    </Box>
  );
}

/* =========================================================
   RESULT ROW
========================================================= */

function ResultRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <Stack
      direction="row"
      sx={{
        py: 1,
        borderBottom: "1px solid #f1f5f9",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
      <Typography
        sx={{
          fontSize: 13,
          color: "#475569",
        }}
      >
        {icon} {label}
      </Typography>

      <Typography
        sx={{
          fontSize: 15,
          fontWeight: 700,
          color,
        }}
      >
        {value}
      </Typography>
    </Stack>
  );
}

/* =========================================================
   SIMULATION STAT CARD
   Same design as Dashboard / Reports cards
========================================================= */
function SimulationStatCard({
  label,
  value,
  color,
  icon,
  extra,
}: {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
  extra?: string | null;
}) {
  return (
    <Card
      elevation={0}
      sx={{
        position: "relative",
        height: 128,
        borderRadius: "22px",

        backgroundColor: "#ffffff",
        color: "#0f172a",
        border: "1px solid #e2e8f0",
        overflow: "hidden",

        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",

        transition: "transform 0.25s ease, box-shadow 0.25s ease",

        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: "0 8px 18px rgba(0,0,0,0.10)",
        },
      }}
    >
      <CardContent
        sx={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          boxSizing: "border-box",
          p: "18px 20px !important",
        }}
      >
        {/* TOP ROW */}
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
          sx={{
            width: "100%",
          }}
        >
          {/* LABEL - LEFT */}
          <Typography
            sx={{
              fontSize: 10.5,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "#64748b",
              textTransform: "uppercase",
              lineHeight: 1.35,
              maxWidth: "70%",
            }}
          >
            {label}
          </Typography>

          {/* ICON - RIGHT */}
          <Box
            className="simulation-stat-icon"
            sx={{
              width: 38,
              height: 38,
              borderRadius: "50%",

              display: "flex",
              alignItems: "center",
              justifyContent: "center",

              backgroundColor: `${color}1A`,

              color: color,

              border: `1px solid ${color}33`,

              flexShrink: 0,

              fontSize: 18,

              ml: "auto",

              transition: "transform 0.25s ease",

              "&:hover": {
                transform: "scale(1.08)",
              },
            }}
          >
            {icon}
          </Box>
        </Stack>

        {/* VALUE */}
        <Typography
          sx={{
            mt: 1.4,
            fontSize: 28,
            lineHeight: 1,
            fontWeight: 800,
            color: "#0f172a",
            letterSpacing: "-0.02em",
          }}
        >
          {value}
        </Typography>

        {/* SUBTEXT */}
        <Typography
          sx={{
            mt: 0.75,
            fontSize: 11,
            color: "#64748b",
            fontWeight: 500,
          }}
        >
          Simulation overview
        </Typography>

        {/* UTILIZATION VALUE */}
        {extra && (
          <Typography
            sx={{
              position: "absolute",
              right: 20,
              bottom: 16,
              fontSize: 11,
              fontWeight: 700,
              color: "#0f172a",
              zIndex: 3,
            }}
          >
            {extra}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

/* =========================================================
   MAIN PAGE
========================================================= */

export default function SimulationPage() {
  const { orgId } = useAuth();

  const resolvedOrgId = orgId || localStorage.getItem("org_id") || "";

  const { dashboard, history, fetchDashboard, fetchHistory } = useSimulation();

  const { run, running, result, trends } = useRunSimulation();

  const isDark = useDark();

  const t = isDark
    ? {
        bg: "#0f172a",
        surface: "#1e293b",
        border: "#334155",
        text: "#f1f5f9",
        muted: "#94a3b8",
        sub: "#64748b",
        inputBg: "#0f172a",
        cardBg: "#1e293b",
      }
    : {
        bg: "#f1f5f9",
        surface: "#fff",
        border: "#e2e8f0",
        text: "#0f172a",
        muted: "#94a3b8",
        sub: "#64748b",
        inputBg: "#fff",
        cardBg: "#fff",
      };

  /* =====================================================
     FORM
  ===================================================== */

  const [form, setForm] = useState<SimulationFormData>({
    arrival_probability: 0.7,
    service_probability: 0.85,
    number_of_arrivals: 200,
    time_horizon: 8,
  });

  const [liveCustomers, setLiveCustomers] = useState("");

  const [liveDoctors, setLiveDoctors] = useState(1);

  const [lastSimId, setLastSimId] = useState<number | null>(null);

  /* =====================================================
     LOAD DATA
  ===================================================== */

  useEffect(() => {
    fetchDashboard();
    fetchHistory(1);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* =====================================================
     LIVE RESULT
  ===================================================== */

  const liveResult = useMemo<LiveResult | null>(() => {
    const n = parseInt(liveCustomers);

    if (!n || n < 1) return null;

    const serviceRate = form.service_probability * liveDoctors;

    const rhoTotal = form.arrival_probability / serviceRate;

    let waitTime: number;

    if (rhoTotal >= 1) {
      waitTime = 999;
    } else {
      waitTime =
        (form.arrival_probability /
          serviceRate /
          (form.service_probability * liveDoctors * (1 - rhoTotal))) *
        60;
    }

    const positionWait = (n - 1) * waitTime;

    return {
      waitForNext: Math.max(0, waitTime).toFixed(1),

      waitForCustomerN: Math.max(0, positionWait).toFixed(1),

      utilization: Math.min(rhoTotal * 100, 100).toFixed(1),

      overloaded: rhoTotal >= 1,

      effectiveServiceRate: (form.service_probability * liveDoctors).toFixed(2),
    };
  }, [
    liveCustomers,
    liveDoctors,
    form.arrival_probability,
    form.service_probability,
  ]);

  /* =====================================================
     RUN SIMULATION
  ===================================================== */

  const handleRun = async () => {
    try {
      const sim = await run(form);

      setLastSimId(sim.id);

      fetchDashboard();
      fetchHistory(1);
    } catch {
      // toast already shown in hook
    }
  };

  /* =====================================================
     RESET
  ===================================================== */

  const handleReset = () => {
    setForm({
      arrival_probability: 0.7,
      service_probability: 0.85,
      number_of_arrivals: 200,
      time_horizon: 8,
    });
  };

  /* =====================================================
     DOWNLOAD
  ===================================================== */

  const download = (data: BlobPart, name: string, mime: string) => {
    const blob = new Blob([data], { type: mime });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url;
    a.download = name;

    document.body.appendChild(a);

    a.click();

    document.body.removeChild(a);

    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  /* =====================================================
     EXPORT MENU
  ===================================================== */

  const [exportAnchor, setExportAnchor] = useState<HTMLElement | null>(null);

  const exportMenuOpen = Boolean(exportAnchor);

  const openExportMenu = (event: React.MouseEvent<HTMLElement>) => {
    setExportAnchor(event.currentTarget);
  };

  const closeExportMenu = () => {
    setExportAnchor(null);
  };

  /* =====================================================
     EXPORT
  ===================================================== */

  const handleExport = async (type: "pdf" | "excel" | "csv") => {
    closeExportMenu();

    const exportId = lastSimId ?? history?.[0]?.id;

    if (!exportId) {
      toast.error("Run a simulation first before exporting");
      return;
    }

    if (!resolvedOrgId) {
      toast.error("Organization not found");
      return;
    }

    const label = type === "pdf" ? "PDF" : type === "excel" ? "Excel" : "CSV";

    const loadingToast = toast.loading(`Preparing ${label} download...`);

    try {
      const res =
        type === "pdf"
          ? await simulationApi.exportPDF(exportId, String(resolvedOrgId))
          : type === "excel"
            ? await simulationApi.exportExcel(exportId, String(resolvedOrgId))
            : await simulationApi.exportCSV(exportId, String(resolvedOrgId));

      const blob: Blob = res.data;

      if (blob.type === "application/json") {
        toast.error(await parseBlobErrorMessage(blob, "Couldn't generate this export. Please try again."), {
          id: loadingToast,
        });

        return;
      }

      const mime =
        type === "pdf"
          ? "application/pdf"
          : type === "excel"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "text/csv";

      const ext = type === "pdf" ? "pdf" : type === "excel" ? "xlsx" : "csv";

      download(res.data, `ISF_Simulation_${exportId}.${ext}`, mime);

      toast.success(`${label} downloaded successfully`, {
        id: loadingToast,
      });
    } catch (err: unknown) {
      const errData = (
        err as {
          response?: {
            data?:
              | Blob
              | {
                  detail?: string;
                  message?: string;
                };
          };
        }
      )?.response?.data;

      if (errData instanceof Blob) {
        toast.error(await parseBlobErrorMessage(errData, "Couldn't generate this export. Please try again."), {
          id: loadingToast,
        });

        return;
      }

      const msg =
        (
          errData as {
            detail?: string;
            message?: string;
          }
        )?.detail ??
        (
          errData as {
            detail?: string;
            message?: string;
          }
        )?.message ??
        "Export failed";

      toast.error(msg, {
        id: loadingToast,
      });
    }
  };

  /* =====================================================
     DISPLAY DATA
  ===================================================== */

  const displayData: (SimulationDashboard & Partial<SimulationResult>) | null =
    result
      ? {
          ...result,
          total_simulations: dashboard?.total_simulations ?? 0,
        }
      : dashboard;

  /* =====================================================
     CARDS
  ===================================================== */

  const utilizationValue =
    displayData?.utilization != null ? Number(displayData.utilization) : 0;

  const CARDS = [
    {
      key: "total_customers",
      label: "TOTAL CUSTOMERS",
      value: displayData?.total_customers ?? 0,
      color: "#2563EB",
      icon: <PeopleAltIcon />,
    },

    {
      key: "customers_served",
      label: "CUSTOMERS SERVED",
      value: displayData?.customers_served ?? 0,
      color: "#16A34A",
      icon: <CheckCircleIcon />,
    },

    {
      key: "currently_waiting",
      label: "CURRENTLY WAITING",
      value: displayData?.currently_waiting ?? 0,
      color: "#F59E0B",
      icon: <HourglassBottomIcon />,
    },

    {
      key: "left_without_service",
      label: "LEFT WITHOUT SERVICE",
      value: displayData?.left_without_service ?? 0,
      color: "#DC2626",
      icon: <PersonOffIcon />,
    },

    {
      key: "average_waiting_time",
      label: "AVG WAITING TIME",
      value:
        displayData?.average_waiting_time != null
          ? `${Number(displayData.average_waiting_time).toFixed(0)} min`
          : "0 min",
      color: "#7C3AED",
      icon: <AccessTimeIcon />,
    },

    {
      key: "maximum_waiting_time",
      label: "MAX WAITING TIME",
      value:
        displayData?.maximum_waiting_time != null
          ? `${Number(displayData.maximum_waiting_time).toFixed(0)} min`
          : "0 min",
      color: "#EA580C",
      icon: <ScheduleIcon />,
    },

    {
      key: "idle_time",
      label: "IDLE TIME",
      value:
        displayData?.idle_time != null
          ? `${Number(displayData.idle_time).toFixed(0)}%`
          : "0%",
      color: "#0891B2",
      icon: <HotelIcon />,
    },

    {
      key: "utilization",
      label: "UTILIZATION",
      value:
        utilizationValue >= 80
          ? "High"
          : utilizationValue >= 50
            ? "Medium"
            : "Low",

      extra:
        displayData?.utilization != null
          ? `${utilizationValue.toFixed(0)}%`
          : null,

      color:
        utilizationValue >= 80
          ? "#EF4444"
          : utilizationValue >= 50
            ? "#F59E0B"
            : "#22C55E",

      icon: <TrendingUpIcon />,
    },
  ];

  /* =====================================================
     INPUT STYLE
  ===================================================== */

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      borderRadius: 2,

      backgroundColor: t.inputBg,

      fontSize: 14,

      "& fieldset": {
        borderColor: t.border,
      },

      "&:hover fieldset": {
        borderColor: "#94a3b8",
      },

      "&.Mui-focused fieldset": {
        borderColor: TEAL,
      },
    },

    "& .MuiInputBase-input": {
      color: t.text,
    },
  };

  /* =====================================================
     PAGE
  ===================================================== */

  return (
    <Box
      sx={{
        backgroundColor: t.bg,

        minHeight: "100%",

        p: {
          xs: 2,
          md: 3,
        },
      }}
    >
      {/* =================================================
          HEADER
      ================================================= */}

      <Stack
        direction={{
          xs: "column",
          md: "row",
        }}
        spacing={2}
        sx={{
          mb: 3,
          justifyContent: "space-between",
          alignItems: {
            xs: "flex-start",
            md: "center",
          },
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: {
                xs: 26,
                md: 30,
              },

              fontWeight: 700,

              color: t.text,

              lineHeight: 1.2,
            }}
          >
            Simulations
          </Typography>

          <Typography
            sx={{
              mt: 0.75,

              fontSize: 14,

              color: t.sub,
            }}
          >
            Run Monte Carlo simulations to forecast queue load and staffing
            needs.
          </Typography>
        </Box>

        {/* =================================================
            EXPORT
        ================================================= */}

        <Stack
          direction="row"
          spacing={1}
          alignItems="center"
          sx={{
            ml: "auto",
          }}
        >
          <IconButton
            onClick={openExportMenu}
            sx={{
              width: 40,
              height: 40,

              borderRadius: 2,

              border: `1px solid ${t.border}`,

              color: t.text,

              backgroundColor: t.surface,

              transition: "all 0.25s ease",

              "&:hover": {
                backgroundColor: TEAL,

                color: "#ffffff",

                borderColor: TEAL,

                transform: "translateY(-2px)",

                boxShadow: "0 6px 15px rgba(13,148,136,0.25)",
              },
            }}
          >
            <MoreVertIcon />
          </IconButton>

          {/* EXPORT MENU */}

          <Menu
            anchorEl={exportAnchor}
            open={exportMenuOpen}
            onClose={closeExportMenu}
            anchorOrigin={{
              vertical: "bottom",
              horizontal: "right",
            }}
            transformOrigin={{
              vertical: "top",
              horizontal: "right",
            }}
            slotProps={{
              paper: {
                elevation: 5,
                sx: {
                  mt: 1,
                  minWidth: 190,
                  borderRadius: 2.5,
                  overflow: "hidden",
                  border: `1px solid ${t.border}`,
                },
              },
            }}
          >
            <MenuItem
              onClick={() => handleExport("pdf")}
              sx={{
                py: 1.25,
                gap: 1.5,

                "&:hover": {
                  backgroundColor: "#fef2f2",

                  color: "#dc2626",
                },
              }}
            >
              <PictureAsPdfIcon
                sx={{
                  color: "#dc2626",
                }}
              />

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Download PDF
              </Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleExport("excel")}
              sx={{
                py: 1.25,
                gap: 1.5,

                "&:hover": {
                  backgroundColor: "#f0fdf4",

                  color: "#16a34a",
                },
              }}
            >
              <TableViewIcon
                sx={{
                  color: "#16a34a",
                }}
              />

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Download Excel
              </Typography>
            </MenuItem>

            <MenuItem
              onClick={() => handleExport("csv")}
              sx={{
                py: 1.25,
                gap: 1.5,

                "&:hover": {
                  backgroundColor: "#fffbeb",

                  color: "#d97706",
                },
              }}
            >
              <DescriptionIcon
                sx={{
                  color: "#d97706",
                }}
              />

              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Download CSV
              </Typography>
            </MenuItem>
          </Menu>
        </Stack>
      </Stack>

      {/* =================================================
          STAT CARDS
      ================================================= */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            sm: "repeat(2, 1fr)",

            md: "repeat(3, 1fr)",

            lg: "repeat(4, 1fr)",
          },

          gap: 1.5,

          mb: 2,
        }}
      >
        {CARDS.map((card) => (
          <SimulationStatCard
            key={card.key}
            label={card.label}
            value={card.value}
            color={card.color}
            icon={card.icon}
            extra={"extra" in card ? card.extra : null}
          />
        ))}
      </Box>

      {/* =================================================
          TWO COLUMN CONTENT
      ================================================= */}

      <Box
        sx={{
          display: "grid",

          gridTemplateColumns: {
            xs: "1fr",

            lg: "300px 1fr",
          },

          gap: 2,

          alignItems: "start",
        }}
      >
        {/* =================================================
            LEFT COLUMN
        ================================================= */}

        <Stack spacing={2}>
          {/* SIMULATION CONTROL */}

          <Paper
            elevation={0}
            sx={{
              backgroundColor: t.surface,

              borderRadius: 3,

              p: 2.25,

              border: `1px solid ${t.border}`,

              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Typography
              sx={{
                mb: 2,

                fontSize: 15,

                fontWeight: 700,

                color: TEAL,
              }}
            >
              Simulation control
            </Typography>

            <SliderRow
              label="ARRIVAL PROBABILITY"
              value={form.arrival_probability}
              min={0.01}
              max={1}
              step={0.01}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  arrival_probability: v,
                }))
              }
            />

            <SliderRow
              label="SERVICE PROBABILITY"
              value={form.service_probability}
              min={0.01}
              max={1}
              step={0.01}
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  service_probability: v,
                }))
              }
            />

            <SliderRow
              label="SIMULATED ARRIVALS"
              value={form.number_of_arrivals}
              min={1}
              max={2000}
              step={1}
              integer
              onChange={(v) =>
                setForm((f) => ({
                  ...f,
                  number_of_arrivals: v,
                }))
              }
            />

            <TextField
              fullWidth
              type="number"
              label="Time Horizon (Hours)"
              value={form.time_horizon}
              slotProps={{
                htmlInput: {
                  min: 1,
                  max: 720,
                },
              }}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  time_horizon: parseInt(e.target.value) || 1,
                }))
              }
              sx={{
                ...inputSx,

                mb: 1.5,

                "& .MuiInputLabel-root": {
                  fontSize: 13,
                },
              }}
            />

            {/* RUN */}

            <Button
              fullWidth
              variant="contained"
              onClick={handleRun}
              disabled={running}
              sx={{
                py: 1.2,

                mb: 1,

                borderRadius: 2,

                textTransform: "none",

                fontWeight: 700,

                background: "linear-gradient(135deg,#0d9488,#0891b2)",

                "&:hover": {
                  background: "linear-gradient(135deg,#0f766e,#0e7490)",
                },
              }}
            >
              {running ? "Running..." : "▶ Run simulation"}
            </Button>

            {/* RESET */}

            <Button
              fullWidth
              variant="outlined"
              onClick={handleReset}
              disabled={running}
              sx={{
                py: 1,

                borderRadius: 2,

                textTransform: "none",

                fontWeight: 600,

                color: t.sub,

                borderColor: t.border,
              }}
            >
              ↺ Reset
            </Button>
          </Paper>

          {/* =================================================
              RECENT SIMULATIONS
          ================================================= */}

          <Paper
            elevation={0}
            sx={{
              backgroundColor: t.surface,

              borderRadius: 3,

              p: 2.25,

              border: `1px solid ${t.border}`,

              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Typography
              sx={{
                mb: 1.5,

                fontSize: 15,

                fontWeight: 700,

                color: t.text,
              }}
            >
              Recent simulations
            </Typography>

            {history && history.length > 0 ? (
              <Stack>
                {history.slice(0, 3).map((sim) => (
                  <Stack
                    key={sim.id}
                    direction="row"
                    sx={{
                      py: 1.25,
                      borderBottom: `1px solid ${t.border}`,
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Box>
                      <Typography
                        sx={{
                          fontSize: 13,

                          fontWeight: 600,

                          color: t.text,
                        }}
                      >
                        Simulation run #{sim.number_of_arrivals}
                      </Typography>

                      <Typography
                        sx={{
                          fontSize: 11,

                          color: t.muted,

                          mt: 0.25,
                        }}
                      >
                        {formatDate(sim.created_at)}
                      </Typography>
                    </Box>

                    <Box
                      sx={{
                        px: 1.25,

                        py: 0.4,

                        borderRadius: 99,

                        fontSize: 11,

                        fontWeight: 600,

                        backgroundColor: `${statusColor(sim.status)}22`,

                        color: statusColor(sim.status),

                        textTransform: "capitalize",
                      }}
                    >
                      {sim.status}
                    </Box>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Typography
                sx={{
                  color: "#94a3b8",

                  fontSize: 13,
                }}
              >
                No simulations yet.
              </Typography>
            )}
          </Paper>

          {/* =================================================
              LIVE CUSTOMER CALCULATOR
          ================================================= */}

          <Paper
            elevation={0}
            sx={{
              backgroundColor: t.surface,

              borderRadius: 3,

              p: 2.25,

              border: `1.5px solid ${TEAL}33`,

              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}
          >
            <Typography
              sx={{
                mb: 0.75,

                fontSize: 15,

                fontWeight: 700,

                color: TEAL,
              }}
            >
              🧮 Live Customer Calculator
            </Typography>

            <Typography
              sx={{
                fontSize: 12,

                color: t.sub,

                mb: 1.75,
              }}
            >
              Enter live queue data to instantly calculate wait time & doctor
              impact.
            </Typography>

            <TextField
              fullWidth
              type="number"
              label="Customers in queue right now"
              placeholder="e.g. 15"
              value={liveCustomers}
              onChange={(e) => setLiveCustomers(e.target.value)}
              sx={{
                ...inputSx,

                mb: 1.5,

                "& .MuiInputLabel-root": {
                  fontSize: 13,
                },
              }}
            />

            <Typography
              sx={{
                fontSize: 11,

                fontWeight: 600,

                color: t.sub,

                letterSpacing: "0.05em",

                mb: 0.75,
              }}
            >
              NUMBER OF DOCTORS / SERVERS
            </Typography>

            <Stack
              direction="row"
              spacing={1.5}
              sx={{
                mb: 1.5,
                alignItems: "center",
              }}
            >
              <IconButton
                onClick={() => setLiveDoctors((d) => Math.max(1, d - 1))}
                sx={{
                  width: 34,
                  height: 34,

                  border: `1px solid ${t.border}`,

                  borderRadius: 2,

                  color: TEAL,

                  backgroundColor: t.inputBg,
                }}
              >
                −
              </IconButton>

              <Typography
                sx={{
                  fontSize: 22,

                  fontWeight: 700,

                  color: t.text,

                  minWidth: 30,

                  textAlign: "center",
                }}
              >
                {liveDoctors}
              </Typography>

              <IconButton
                onClick={() => setLiveDoctors((d) => d + 1)}
                sx={{
                  width: 34,
                  height: 34,

                  border: `1px solid ${t.border}`,

                  borderRadius: 2,

                  color: TEAL,

                  backgroundColor: t.inputBg,
                }}
              >
                +
              </IconButton>
            </Stack>

            {/* LIVE RESULT */}

            {liveResult && (
              <Box
                sx={{
                  backgroundColor: isDark ? "#0f172a" : "#f8fafc",

                  borderRadius: 2,

                  p: 1.5,

                  mt: 1.5,
                }}
              >
                {liveResult.overloaded ? (
                  <Box
                    sx={{
                      backgroundColor: "#fef2f2",

                      border: "1px solid #fecaca",

                      borderRadius: 2,

                      p: 1.25,

                      color: "#dc2626",

                      fontSize: 13,

                      fontWeight: 500,
                    }}
                  >
                    ⚠️ Queue is overloaded! Add more doctors.
                  </Box>
                ) : (
                  <>
                    <ResultRow
                      icon="⏱️"
                      label="Next customer wait time"
                      value={`${liveResult.waitForNext} min`}
                      color={
                        parseFloat(liveResult.waitForNext) > 15
                          ? "#ef4444"
                          : "#22c55e"
                      }
                    />

                    <ResultRow
                      icon="👤"
                      label={`Customer #${liveCustomers} wait time`}
                      value={`${liveResult.waitForCustomerN} min`}
                      color={
                        parseFloat(liveResult.waitForCustomerN) > 30
                          ? "#ef4444"
                          : "#f59e0b"
                      }
                    />

                    <ResultRow
                      icon="📊"
                      label="Server utilization"
                      value={`${liveResult.utilization}%`}
                      color={
                        parseFloat(liveResult.utilization) > 85
                          ? "#ef4444"
                          : TEAL
                      }
                    />

                    <ResultRow
                      icon="🏥"
                      label="Effective service rate"
                      value={`${liveResult.effectiveServiceRate}/min`}
                      color="#3b82f6"
                    />

                    <Box
                      sx={{
                        mt: 1,

                        p: 1,

                        backgroundColor: "#f0fdfa",

                        borderRadius: 2,

                        fontSize: 12,

                        color: "#0f766e",
                      }}
                    >
                      💡 With <b>{liveDoctors + 1} doctors</b>: wait drops to ~
                      <b
                        style={{
                          color: TEAL,
                        }}
                      >
                        {calcDoctorWait(form, liveDoctors + 1, liveCustomers)}{" "}
                        min
                      </b>
                    </Box>
                  </>
                )}
              </Box>
            )}

            {!liveCustomers && (
              <Typography
                sx={{
                  textAlign: "center",

                  py: 2,

                  color: "#94a3b8",

                  fontSize: 12,
                }}
              >
                Enter number of customers above to see real-time wait estimates.
              </Typography>
            )}
          </Paper>
        </Stack>

        {/* =================================================
            RIGHT COLUMN
        ================================================= */}

        <Stack spacing={2}>
          <TrendChart trends={trends} />

          <ForecastChart trends={trends} />
        </Stack>
      </Box>
    </Box>
  );
}
