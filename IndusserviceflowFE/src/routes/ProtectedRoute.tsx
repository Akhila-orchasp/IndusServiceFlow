import type { ReactElement } from "react";
import { Navigate } from "react-router-dom";

interface ProtectedRouteProps {
  children: ReactElement;
  allowedRoles: string[];
}
function isTokenExpired(token: string): boolean {
  try {
    const payloadSegment = token.split(".")[1];
    if (!payloadSegment) return true;

    const normalized = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      "="
    );
    const decoded = decodeURIComponent(
      atob(padded)
        .split("")
        .map((c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join("")
    );

    const payload = JSON.parse(decoded);

    if (typeof payload.exp !== "number") return true;

    return Date.now() >= payload.exp * 1000;
  } catch {
    return true;
  }
}

function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("access");

  const role = localStorage.getItem("role");

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("access_token");
    localStorage.removeItem("access");

    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    if (role === "employee") {
      return <Navigate to="/employee/dashboard" replace />;
    }

    if (role === "org_admin") {
      return <Navigate to="/org-admin" replace />;
    }

    if (role === "super_admin") {
      return <Navigate to="/super-admin/dashboard" replace />;
    }

    return <Navigate to="/login" replace />;
  }

  return children;
}

export default ProtectedRoute;
