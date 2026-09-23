import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Typography,
  Stack,
  TextField,
  Button,
  Rating,
  Divider,
  Alert,
  Avatar,
  CircularProgress,
  ThemeProvider,
  CssBaseline,
} from "@mui/material";
import {
  Home as HomeIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  CheckCircle as CheckCircleIcon,
  SentimentDissatisfied as SentimentDissatisfiedIcon,
} from "@mui/icons-material";

import { getApiErrorMessage } from "../../services/api";

import {
  getFeedbackForm,
  submitFeedback,
  type FeedbackForm,
} from "../../services/feedbackService";
import superAdminMuiTheme from "../../theme/superAdminMuiTheme";

const cardSx = {
  borderRadius: 3,
  bgcolor: "background.paper",
  border: "1px solid",
  borderColor: "divider",
  boxShadow: "0 8px 24px rgba(14,60,97,0.08)",
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
        <Box sx={{ maxWidth: 640, mx: "auto" }}>
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

type Draft = Record<number, { rating: number | null; comment: string }>;

const Feedback = () => {
  const { token } = useParams<{ token: string }>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [form, setForm] = useState<FeedbackForm | null>(null);

  const [draft, setDraft] = useState<Draft>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!token) {
      setLoadError("This feedback link is invalid.");
      setLoading(false);
      return;
    }

    (async () => {
      try {
        const data = await getFeedbackForm(token);
        setForm(data);

        const initialDraft: Draft = {};
        data.services.forEach((s) => {
          initialDraft[s.appointment_service_id] = {
            rating: s.rating,
            comment: s.comment || "",
          };
        });
        setDraft(initialDraft);

        if (data.is_submitted) setSubmitted(true);
      } catch (err: unknown) {
        const response = (err as { response?: { status?: number; data?: { message?: string } } })
          ?.response;
        const status = response?.status;
        const message =
          response?.data?.message ||
          (status === 410
            ? "This feedback link has expired."
            : "This feedback link is invalid.");
        setLoadError(message);
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const setRating = (serviceId: number, value: number | null) => {
    setDraft((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], rating: value },
    }));
  };

  const setComment = (serviceId: number, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [serviceId]: { ...prev[serviceId], comment: value },
    }));
  };

  const allRated =
    !!form &&
    form.services.length > 0 &&
    form.services.every((s) => !!draft[s.appointment_service_id]?.rating);

  const handleSubmit = async () => {
    if (!token || !form || submitting) return;

    setSubmitError(null);
    setSubmitting(true);

    try {
      await submitFeedback(
        token,
        form.services.map((s) => ({
          appointment_service_id: s.appointment_service_id,
          rating: draft[s.appointment_service_id]?.rating || 0,
          comment: draft[s.appointment_service_id]?.comment || undefined,
        }))
      );
      setSubmitted(true);
    } catch (err: unknown) {
      setSubmitError(
        getApiErrorMessage(err, "Couldn't submit your feedback. Please try again.")
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell>
        <Stack alignItems="center" sx={{ py: 8 }}>
          <CircularProgress />
        </Stack>
      </PageShell>
    );
  }

  // ── Invalid / expired link ─────────────────────────────────────
  if (loadError || !form) {
    return (
      <PageShell>
        <Stack spacing={1.5} sx={{ mb: 3, textAlign: "center", alignItems: "center" }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "warning.main" }}>
            <SentimentDissatisfiedIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
            We couldn't open this link
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {loadError || "This feedback link is invalid."}
          </Typography>
        </Stack>
      </PageShell>
    );
  }

  // ── Thank you / already submitted ──────────────────────────────
  if (submitted) {
    return (
      <PageShell>
        <Stack spacing={1.5} sx={{ mb: 3, textAlign: "center", alignItems: "center" }}>
          <Avatar sx={{ width: 64, height: 64, bgcolor: "success.main" }}>
            <CheckCircleIcon sx={{ fontSize: 32 }} />
          </Avatar>
          <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
            Thank you for your feedback!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
            {form.customer_name}, we've recorded your ratings for the visit
            on {fmtDateLong(form.date)}.
          </Typography>
        </Stack>

        <Paper elevation={0} sx={{ ...cardSx, p: { xs: 2.5, sm: 3.5 } }}>
          <Stack spacing={2}>
            {form.services.map((s) => (
              <Box key={s.appointment_service_id}>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={1}
                  sx={{ justifyContent: "space-between", alignItems: { sm: "center" } }}
                >
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {s.service_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.employee_name ?? "Unassigned"}
                    </Typography>
                  </Box>
                  <Rating
                    value={draft[s.appointment_service_id]?.rating ?? 0}
                    readOnly
                    icon={<StarIcon fontSize="inherit" />}
                    emptyIcon={<StarBorderIcon fontSize="inherit" />}
                  />
                </Stack>
                <Divider sx={{ mt: 1.5 }} />
              </Box>
            ))}
          </Stack>
        </Paper>
      </PageShell>
    );
  }

  // ── Rating form ─────────────────────────────────────────────────
  return (
    <PageShell>
      <Stack spacing={1.5} sx={{ mb: 3, textAlign: "center", alignItems: "center" }}>
        <Typography variant="h5" sx={{ fontWeight: 700, fontFamily: "'Sora', sans-serif" }}>
          How was your visit?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 420 }}>
          Hi {form.customer_name}, thanks for visiting{" "}
          {form.organization_name || "us"} on {fmtDateLong(form.date)}. Please
          rate each team member who helped you.
        </Typography>
      </Stack>

      <Paper elevation={0} sx={{ ...cardSx, p: { xs: 2.5, sm: 3.5 } }}>
        <Stack spacing={3}>
          {form.services.map((s) => (
            <Box key={s.appointment_service_id}>
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.5}
                sx={{ justifyContent: "space-between", alignItems: { sm: "center" }, mb: 1.5 }}
              >
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {s.service_name}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Served by {s.employee_name ?? "an unassigned team member"}
                  </Typography>
                </Box>
                <Rating
                  size="large"
                  value={draft[s.appointment_service_id]?.rating ?? null}
                  onChange={(_, value) => setRating(s.appointment_service_id, value)}
                  icon={<StarIcon fontSize="inherit" />}
                  emptyIcon={<StarBorderIcon fontSize="inherit" />}
                />
              </Stack>

              <TextField
                fullWidth
                multiline
                minRows={2}
                placeholder={`Anything you'd like to share about ${
                  s.employee_name ?? "this service"
                }? (optional)`}
                value={draft[s.appointment_service_id]?.comment ?? ""}
                onChange={(e) => setComment(s.appointment_service_id, e.target.value)}
              />

              <Divider sx={{ mt: 3 }} />
            </Box>
          ))}
        </Stack>

        {submitError && (
          <Alert severity="error" sx={{ mt: 3 }}>
            {submitError}
          </Alert>
        )}

        {!allRated && (
          <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
            Please give a star rating to every team member before submitting.
          </Typography>
        )}

        <Button
          fullWidth
          variant="contained"
          size="large"
          disabled={!allRated || submitting}
          onClick={handleSubmit}
          sx={{ mt: 2 }}
        >
          {submitting ? "Submitting..." : "Submit feedback"}
        </Button>
      </Paper>
    </PageShell>
  );
};

export default Feedback;
