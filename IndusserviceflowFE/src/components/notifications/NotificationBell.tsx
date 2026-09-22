import { useEffect, useRef, useState } from "react";
import {
  Badge,
  Box,
  ClickAwayListener,
  Fade,
  IconButton,
  Paper,
  Popper,
  Stack,
  Typography,
} from "@mui/material";
import {
  Notifications as NotificationsIcon,
  AccountCircle as AccountCircleIcon,
  CalendarMonth as CalendarMonthIcon,
  HourglassEmpty as HourglassEmptyIcon,
  Apartment as ApartmentIcon,
} from "@mui/icons-material";
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../../services/notificationservice";

type NotificationScope =
  | { level: "employee"; employeeId: string | number }
  | { level: "org"; orgId: string | number }
  | { level: "super" };

interface NotificationItem {
  notification_id: number;
  org_id: number | null;
  recipient_type: "Customer" | "Employee" | "Organization" | "OrganizationAdmin";
  customer_name: string | null;
  employee_name: string | null;
  organization_name: string | null;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_on: string;
}

const timeAgo = (iso: string) => {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
};

const CATEGORY_COLORS = {
  teal: { bg: "#ecfdf5", color: "#0f766e" },
  blue: { bg: "#dbeafe", color: "#1d4ed8" },
  green: { bg: "#d1fae5", color: "#067647" },
  amber: { bg: "#fef3c7", color: "#92400e" },
} as const;

const getIconMeta = (n: NotificationItem) => {
  const key = `${n.notification_type} ${n.title}`.toLowerCase();
  if (key.includes("profile")) return { icon: <AccountCircleIcon fontSize="small" />, palette: CATEGORY_COLORS.teal };
  if (key.includes("appointment") || key.includes("queue"))
    return {
      icon: key.includes("queue") ? <HourglassEmptyIcon fontSize="small" /> : <CalendarMonthIcon fontSize="small" />,
      palette: CATEGORY_COLORS.blue,
    };
  if (key.includes("org") || key.includes("subscription") || key.includes("plan"))
    return { icon: <ApartmentIcon fontSize="small" />, palette: CATEGORY_COLORS.green };
  return { icon: <NotificationsIcon fontSize="small" />, palette: CATEGORY_COLORS.amber };
};

const shakeKeyframes = {
  "0%, 100%": { transform: "rotate(0deg)" },
  "20%": { transform: "rotate(-12deg)" },
  "40%": { transform: "rotate(10deg)" },
  "60%": { transform: "rotate(-6deg)" },
  "80%": { transform: "rotate(4deg)" },
};
const badgePopKeyframes = {
  "0%": { transform: "scale(1)" },
  "40%": { transform: "scale(1.35)" },
  "100%": { transform: "scale(1)" },
};
const livePulseKeyframes = {
  "0%, 100%": { opacity: 1, transform: "scale(1)" },
  "50%": { opacity: 0.4, transform: "scale(1.4)" },
};
const itemFlashKeyframes = {
  "0%": { backgroundColor: "#ccfbf1" },
  "100%": { backgroundColor: "transparent" },
};

interface NotificationBellProps {
  scope: NotificationScope;
  pollMs?: number;
  livePollMs?: number;
}

const NotificationBell = ({ scope, pollMs = 20000, livePollMs = 10000 }: NotificationBellProps) => {
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [freshIds, setFreshIds] = useState<Set<number>>(new Set());
  const anchorRef = useRef<HTMLButtonElement>(null);
  const prevUnreadRef = useRef<number | null>(null);
  const knownIdsRef = useRef<Set<number>>(new Set());
  const initialRefreshScopeRef = useRef<string | null>(null);

  const scopeKey = JSON.stringify(scope);

  useEffect(() => {
    const refresh = () => {
      getUnreadNotificationCount(scope)
        .then((res) => {
          const next = res.data?.unread_count ?? 0;
          if (prevUnreadRef.current !== null && next > prevUnreadRef.current) {
            setPulse(true);
            setTimeout(() => setPulse(false), 1000);
          }
          prevUnreadRef.current = next;
          setUnreadCount(next);
        })
        .catch((error) => console.error("Notification request failed:", error));
    };

    if (initialRefreshScopeRef.current !== scopeKey) {
      initialRefreshScopeRef.current = scopeKey;
      refresh();
    }
    const interval = setInterval(refresh, pollMs);
    return () => clearInterval(interval);
  }, [scopeKey, pollMs]);

  const applyResults = (rows: NotificationItem[], isFirstLoad: boolean) => {
    if (!isFirstLoad) {
      const newlySeen = rows.filter((n) => !knownIdsRef.current.has(n.notification_id));
      if (newlySeen.length > 0) {
        const ids = newlySeen.map((n) => n.notification_id);
        setFreshIds((prev) => new Set([...prev, ...ids]));
        setTimeout(() => {
          setFreshIds((prev) => {
            const copy = new Set(prev);
            ids.forEach((id) => copy.delete(id));
            return copy;
          });
        }, 4000);
      }
    }
    knownIdsRef.current = new Set(rows.map((n) => n.notification_id));
    setNotifications(rows);
  };

  const fetchList = (isFirstLoad: boolean) => {
    getNotifications(scope)
      .then((res) => {
        const payload = res.data;
        const rows = Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : [];
        applyResults(rows.slice(0, 15), isFirstLoad);
      })
      .catch(() => {
        if (isFirstLoad) setNotifications([]);
      })
      .finally(() => {
        if (isFirstLoad) setLoading(false);
      });
  };

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setLoading(true);
      fetchList(true);
    }
  };

  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => fetchList(false), livePollMs);
    return () => clearInterval(interval);
  }, [open, livePollMs, scopeKey]);

  const handleMarkRead = (id: number) => {
    markNotificationRead(id)
      .then(() => {
        setNotifications((prev) => prev.map((n) => (n.notification_id === id ? { ...n, is_read: true } : n)));
        setUnreadCount((prev) => Math.max(0, prev - 1));
        prevUnreadRef.current = Math.max(0, (prevUnreadRef.current ?? 1) - 1);
      })
      .catch((error) => console.error("Notification request failed:", error));
  };

  const handleMarkAllRead = () => {
    markAllNotificationsRead(scope)
      .then(() => {
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
        setUnreadCount(0);
        prevUnreadRef.current = 0;
      })
      .catch((error) => console.error("Notification request failed:", error));
  };

  const showRecipientTag = scope.level !== "employee";

  return (
    <Box sx={{ position: "relative" }}>
      <IconButton
        ref={anchorRef}
        onClick={toggleOpen}
        title="Notifications"
        sx={{
          width: 45,
          height: 45,
          bgcolor: "#f3f4f6",
          color: "#374151",
          "&:hover": { bgcolor: "#e5e7eb" },
          animation: pulse ? "notifBellShake 0.5s ease" : "none",
          "@keyframes notifBellShake": shakeKeyframes,
        }}
      >
        <Badge
          badgeContent={unreadCount > 9 ? "9+" : unreadCount}
          color="error"
          invisible={unreadCount === 0}
          sx={{
            "& .MuiBadge-badge": {
              animation: pulse ? "notifBadgePop 0.6s ease" : "none",
              "@keyframes notifBadgePop": badgePopKeyframes,
            },
          }}
        >
          <NotificationsIcon fontSize="small" />
        </Badge>
      </IconButton>

      <Popper
        open={open}
        anchorEl={anchorRef.current}
        placement="bottom-end"
        transition
        sx={{ zIndex: (theme) => theme.zIndex.modal }}
        modifiers={[{ name: "offset", options: { offset: [0, 10] } }]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper
              elevation={0}
              sx={{
                width: { xs: "calc(100vw - 24px)", sm: 360 },
                maxWidth: { xs: "calc(100vw - 24px)", sm: 360 },
                maxHeight: { xs: "calc(100vh - 120px)", sm: 460 },
                border: "1px solid #e5e7eb",
                borderRadius: "14px",
                boxShadow: "0 14px 36px rgba(16,24,40,0.14)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <ClickAwayListener onClickAway={() => setOpen(false)}>
                <Box sx={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <Stack
                    direction="row"
                    sx={{
                      justifyContent: "space-between",
                      alignItems: "center",
                      px: 2.25,
                      py: 1.75,
                      borderBottom: "1px solid #f0f0f0",
                    }}
                  >
                    <Stack direction="row" spacing={1.25} sx={{ alignItems: "center" }}>
                      <Typography sx={{ fontWeight: 700, fontSize: 15, color: "#101828" }}>
                        Notifications
                      </Typography>
                      <Stack
                        direction="row"
                        spacing={0.6}
                        sx={{
                          alignItems: "center",
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: "#0f766e",
                          bgcolor: "#ecfdf5",
                          borderRadius: 999,
                          px: 1.1,
                          py: 0.3,
                        }}
                        title="Updating in real time"
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            bgcolor: "#0f766e",
                            animation: "notifLivePulse 1.6s ease-in-out infinite",
                            "@keyframes notifLivePulse": livePulseKeyframes,
                          }}
                        />
                        <span>Live</span>
                      </Stack>
                    </Stack>
                    {unreadCount > 0 && (
                      <Typography
                        component="button"
                        onClick={handleMarkAllRead}
                        sx={{
                          border: "none",
                          background: "none",
                          color: "#0f766e",
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                          p: 0,
                          "&:hover": { textDecoration: "underline" },
                        }}
                      >
                        Mark all read
                      </Typography>
                    )}
                  </Stack>

                  <Box sx={{ overflowY: "auto", flex: "1 1 auto", minHeight: 0 }}>
                    {loading && (
                      <Typography sx={{ py: 3.5, px: 2, textAlign: "center", color: "#98a2b3", fontSize: 13 }}>
                        Loading...
                      </Typography>
                    )}

                    {!loading && notifications.length === 0 && (
                      <Typography sx={{ py: 3.5, px: 2, textAlign: "center", color: "#98a2b3", fontSize: 13 }}>
                        You're all caught up.
                      </Typography>
                    )}

                    {!loading &&
                      notifications.map((n) => {
                        const meta = getIconMeta(n);
                        const isFresh = freshIds.has(n.notification_id);
                        return (
                          <Box
                            key={n.notification_id}
                            onClick={() => !n.is_read && handleMarkRead(n.notification_id)}
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              gap: 1.5,
                              px: 2.25,
                              py: 1.5,
                              borderBottom: "1px solid #f5f6f8",
                              cursor: "pointer",
                              position: "relative",
                              bgcolor: n.is_read ? "transparent" : "#f0fdfa",
                              transition: "background 0.2s",
                              "&:hover": { bgcolor: n.is_read ? "#f9fafb" : "#f0fdfa" },
                              ...(isFresh && {
                                animation: "notifItemIn 0.4s ease, notifItemFlash 2.5s ease",
                                "@keyframes notifItemIn": {
                                  from: { opacity: 0, transform: "translateY(-6px)" },
                                  to: { opacity: 1, transform: "translateY(0)" },
                                },
                                "@keyframes notifItemFlash": itemFlashKeyframes,
                              }),
                            }}
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: "50%",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                bgcolor: meta.palette.bg,
                                color: meta.palette.color,
                              }}
                            >
                              {meta.icon}
                            </Box>

                            <Box sx={{ flex: "1 1 auto", minWidth: 0 }}>
                              <Stack
                                direction="row"
                                spacing={1}
                                sx={{ justifyContent: "space-between", alignItems: "center", minWidth: 0 }}
                              >
                                <Typography
                                  sx={{
                                    fontSize: 13,
                                    fontWeight: 600,
                                    color: "#111827",
                                    flex: "1 1 auto",
                                    minWidth: 0,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {n.title}
                                </Typography>
                                {showRecipientTag && (
                                  <Typography
                                    sx={{
                                      fontSize: 11,
                                      color: "#6b7280",
                                      bgcolor: "#f3f4f6",
                                      borderRadius: 999,
                                      px: 1,
                                      py: 0.1,
                                      whiteSpace: "nowrap",
                                      flexShrink: 0,
                                    }}
                                  >
                                    {n.recipient_type === "Customer"
                                      ? n.customer_name
                                      : n.recipient_type === "Employee"
                                      ? n.employee_name
                                      : n.recipient_type === "OrganizationAdmin"
                                      ? "Organization Admin"
                                      : n.organization_name}
                                  </Typography>
                                )}
                              </Stack>
                              <Typography sx={{ fontSize: 12.5, color: "#4b5563", mt: 0.25, wordBreak: "break-word" }}>
                                {n.message}
                              </Typography>
                              <Typography sx={{ fontSize: 11, color: "#9ca3af", mt: 0.5 }}>
                                {timeAgo(n.created_on)}
                              </Typography>
                            </Box>

                            {!n.is_read && (
                              <Box
                                sx={{
                                  width: 8,
                                  height: 8,
                                  borderRadius: "50%",
                                  bgcolor: "#0f766e",
                                  flexShrink: 0,
                                  mt: 0.75,
                                }}
                              />
                            )}
                          </Box>
                        );
                      })}
                  </Box>
                </Box>
              </ClickAwayListener>
            </Paper>
          </Fade>
        )}
      </Popper>
    </Box>
  );
};

export default NotificationBell;