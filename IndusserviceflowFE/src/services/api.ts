import axios from "axios";

export const API_BASE_URL =
  (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env
    ?.VITE_API_URL || "https://indusserviceflow-production.up.railway.app/api";


const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

const STATUS_FALLBACK_MESSAGES: Record<number, string> = {
  400: "Please check the details you entered and try again.",
  401: "Your session has expired. Please log in again.",
  403: "You don't have permission to do this.",
  404: "We couldn't find what you were looking for.",
  405: "That action isn't supported here.",
  408: "The request timed out. Please try again.",
  409: "This conflicts with existing data. Please refresh and try again.",
  413: "That file is too large to upload.",
  422: "Some of the details you entered aren't valid.",
  429: "Too many attempts. Please wait a moment and try again.",
  500: "Something went wrong on our end. Please try again in a moment.",
  502: "The server is temporarily unavailable. Please try again shortly.",
  503: "The service is temporarily unavailable. Please try again shortly.",
  504: "The server took too long to respond. Please try again.",
};

const looksLikeRawServerOutput = (text: string): boolean => {
  if (text.length > 300) return true;
  const head = text.slice(0, 200).toLowerCase();
  return (
    head.includes("<html") ||
    head.includes("<!doctype") ||
    head.includes("<body") ||
    head.includes("traceback (most recent call last)") ||
    /^\s*\w*error\b.*\bat\b/i.test(text)
  );
};

const findFirstMessage = (value: unknown): string | null => {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstMessage(item);
      if (found) return found;
    }
    return null;
  }
  if (value && typeof value === "object") {
    for (const val of Object.values(value as Record<string, unknown>)) {
      const found = findFirstMessage(val);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "string" && value.trim()) {
    const text = value.trim();
    return looksLikeRawServerOutput(text) ? null : text;
  }
  return null;
};

export const getApiErrorMessage = (error: unknown, fallback = "Something went wrong. Please try again."): string => {
  if (typeof error === "object" && error !== null) {
    const err = error as {
      response?: { status?: number; data?: unknown };
      request?: unknown;
      code?: string;
    };

    if (err.response) {
      const fromBody = findFirstMessage(err.response.data);
      if (fromBody) return fromBody;
      const status = err.response.status;
      if (status && STATUS_FALLBACK_MESSAGES[status]) return STATUS_FALLBACK_MESSAGES[status];
      return fallback;
    }

    if (err.request) {
      return err.code === "ECONNABORTED"
        ? "The request timed out. Please check your connection and try again."
        : "Unable to reach the server. Please check your internet connection and try again.";
    }
  }

  if (error instanceof Error && error.message.trim() && !/request failed with status code/i.test(error.message)) {
    return error.message;
  }
  return fallback;
};

export const parseBlobErrorMessage = async (
  blob: Blob,
  fallback = "We couldn't generate this file right now. Please try again."
): Promise<string> => {
  try {
    const text = await blob.text();
    const parsed = JSON.parse(text);
    return findFirstMessage(parsed) || fallback;
  } catch {
    return fallback;
  }
};

export const attachFriendlyErrorInterceptor = (instance: ReturnType<typeof axios.create>) => {
  instance.interceptors.response.use(
    (response) => response,
    async (error) => {
      if (typeof error !== "object" || error === null) {
        return Promise.reject(error);
      }

      const err = error as {
        response?: { status?: number; data?: unknown };
        request?: unknown;
        code?: string;
        message?: string;
        config?: { url?: string };
      };

      if (err.response) {
        console.error(`API error on ${err.config?.url ?? "unknown endpoint"}:`, err.response.status, err.response.data);

        const originalData = err.response.data;
        const isBlob = typeof Blob !== "undefined" && originalData instanceof Blob;

        if (isBlob) {
          const status = err.response.status;
          err.message = await parseBlobErrorMessage(
            originalData as Blob,
            (status && STATUS_FALLBACK_MESSAGES[status]) || "Something went wrong. Please try again."
          );
        } else {
          const friendly = getApiErrorMessage(error);
          err.response.data = {
            ...(originalData && typeof originalData === "object" ? originalData : {}),
            message: friendly,
          };
          err.message = friendly;
        }
      } else {
        console.error("API request failed with no response:", error);
        err.message = getApiErrorMessage(error);
      }

      return Promise.reject(error);
    }
  );
};

const PUBLIC_ENDPOINTS = [
  "/auth/login/",
  "/auth/forgot-password/",
  "/auth/verify-otp/",
  "/auth/reset-password/",
  "/super-admin/organizations/register/",
  "/public/plans/",
  "/public/subscriptions/",
  "/landing/",
  "/landing/stats/",
  "/landing/features/",
  "/landing/plans/",
  "/dashboard/contact/",
  "/newsletter/",
  "/appointments/public/",
  "/appointments/available-slots/",
  "/feedback/",
];

api.interceptors.request.use(
  (config) => {
    const isPublic = PUBLIC_ENDPOINTS.some((url) =>
      config.url?.includes(url)
    );

    if (!isPublic) {
      const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("access");

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }

    return config;
  },
  (error) => Promise.reject(error)
);

export const login = async (data: any) => {
  const response = await api.post("/auth/login/", data);
  return response.data;
};

export const logout = async () => {
  const response = await api.post("/auth/logout/");
  return response.data;
};

export const registerOrganization = async (data: any) => {
  const response = await api.post(
    "/super-admin/organizations/register/",
    data
  );

  return response.data;
};

export const getOrganizations = async (
  params?: Record<string, any>,
  options?: { signal?: AbortSignal }
) => {
  const response = await api.get(
    "/super-admin/organizations/",
    { params, signal: options?.signal }
  );

  return response.data;
};

export const getOrganizationById = async (
  id: number | string
) => {
  const response = await api.get(
    `/super-admin/organizations/${id}/`
  );

  return response.data;
};

export const approveOrganization = async (
  id: number | string
) => {
  const response = await api.put(
    `/super-admin/organizations/approve/${id}/`
  );

  return response.data;
};

export const rejectOrganization = async (
  id: number | string
) => {
  const response = await api.put(
    `/super-admin/organizations/reject/${id}/`
  );

  return response.data;
};

export const deleteOrganization = async (
  id: number | string
) => {
  const response = await api.delete(
    `/super-admin/organizations/delete/${id}/`
  );

  return response.data;
};

export const exportOrganizations = async (
  format: "csv" | "excel" | "pdf",
  params?: Record<string, any>
) => {
  const response = await api.get(
    `/super-admin/organizations/export/`,
    {
      params: {
        export_format: format,
        ...params,
      },
      responseType: "blob",
    }
  );

  return response.data;
};
export const getPublicPlans = async () => {
  const response = await api.get("/public/plans/");
  return response.data;
};

export const registerOrganizationWithPlan = async (data: any) => {
  const response = await api.post("/super-admin/organizations/register/", data);
  return response.data;
};

export const getRegistrationPaymentStatus = async (subscriptionId: number | string) => {
  const response = await api.get(`/public/subscriptions/${subscriptionId}/payment-status/`);
  return response.data;
};

export const simulateRegistrationPayment = async (subscriptionId: number | string) => {
  const response = await api.post(`/public/subscriptions/${subscriptionId}/simulate-payment/`);
  return response.data;
};

export const downloadPublicSubscriptionReceipt = async (subscriptionId: number | string): Promise<Blob> => {
  const response = await api.get(`/public/subscriptions/${subscriptionId}/receipt/`, {
    responseType: "blob",
  });

  const blob: Blob = response.data;

  if (blob.type.includes("json") || blob.type.includes("text/html")) {
    throw new Error(await parseBlobErrorMessage(blob, "Couldn't generate the receipt. Please try again."));
  }

  return blob;
};

export const getMySubscriptionStatus = async () => {
  const response = await api.get("/organization/subscription-status/");
  return response.data;
};

export const renewSubscription = async (data: { plan_id: number; billing_cycle: string }) => {
  const response = await api.post("/organization/subscriptions/renew/", data);
  return response.data;
};

export const getRenewalPaymentStatus = async (subscriptionId: number | string) => {
  const response = await api.get(`/organization/subscriptions/${subscriptionId}/payment-status/`);
  return response.data;
};

export const simulateRenewalPayment = async (subscriptionId: number | string) => {
  const response = await api.post(`/organization/subscriptions/${subscriptionId}/simulate-payment/`);
  return response.data;
};

export const downloadSubscriptionReceipt = async (subscriptionId: number | string): Promise<Blob> => {
  const response = await api.get(`/organization/subscriptions/${subscriptionId}/receipt/`, {
    responseType: "blob",
  });

  const blob: Blob = response.data;

  if (blob.type.includes("json") || blob.type.includes("text/html")) {
    throw new Error(await parseBlobErrorMessage(blob, "Couldn't generate the receipt. Please try again."));
  }

  return blob;
};

export const forceActivateSubscription = async (subscriptionId: number | string) => {
  const response = await api.post(`/super-admin/subscriptions/${subscriptionId}/activate/`);
  return response.data;
};

export const deleteSubscription = async (subscriptionId: number | string) => {
  const response = await api.delete(`/super-admin/subscriptions/${subscriptionId}/delete/`);
  return response.data;
};

export const getDashboard = async () => {
  const response = await api.get(
    "/super-admin/dashboard/"
  );

  return response.data;
};

interface ReportDateRange {
  start_date: string;
  end_date: string;
}

export const getSuperAdminReport = async (
  dateRange?: ReportDateRange
) => {
  const response = await api.get(
    "/reports/superadmin/",
    {
      params: {
        export_format: "json",
        ...dateRange,
      },
    }
  );

  return response.data.data || response.data;
};

export const exportSuperAdminReport = async (
  format: "csv" | "excel" | "pdf",
  dateRange?: ReportDateRange
) => {
  const response = await api.get(
    "/reports/superadmin/",
    {
      params: {
        export_format: format,
        ...dateRange,
      },
      responseType: "blob",
    }
  );

  const blob: Blob = response.data;

  if (format === "pdf" && blob.type !== "application/pdf") {
    throw new Error(await parseBlobErrorMessage(blob, "Couldn't generate the PDF report. Please try again."));
  }

  if (blob.type.includes("json") || blob.type.includes("text/html")) {
    throw new Error(await parseBlobErrorMessage(blob, "Couldn't generate the report export. Please try again."));
  }

  return blob;
};

export const getCategories = async (options?: { signal?: AbortSignal }) => {
  const response = await api.get(
    "/super-admin/categories/",
    { signal: options?.signal }
  );

  return response.data;
};

export const getCategoryById = async (
  id: number
) => {
  const response = await api.get(
    `/super-admin/categories/${id}/`
  );

  return response.data;
};

export const createCategory = async (
  data: any
) => {
  const response = await api.post(
    "/super-admin/categories/add/",
    data
  );

  return response.data;
};

export const updateCategory = async (
  id: number,
  data: any
) => {
  const response = await api.put(
    `/super-admin/categories/update/${id}/`,
    data
  );

  return response.data;
};

export const deleteCategory = async (
  id: number
) => {
  const response = await api.delete(
    `/super-admin/categories/delete/${id}/`
  );

  return response.data;
};

export const exportCategories = async (
  format: "csv" | "excel" | "pdf",
  params?: Record<string, any>
) => {
  const response = await api.get(
    `/super-admin/categories/export/`,
    {
      params: {
        export_format: format,
        ...params,
      },
      responseType: "blob",
    }
  );

  return response.data;
};

export const getDefaultServiceCategories = async (
  categoryId: number
) => {
  const response = await api.get(
    `/super-admin/categories/${categoryId}/service-categories/`
  );

  return response.data;
};

export const getDefaultServiceCategoryById = async (
  categoryId: number,
  id: number
) => {
  const response = await api.get(
    `/super-admin/categories/${categoryId}/service-categories/${id}/`
  );

  return response.data;
};

export const createDefaultServiceCategory = async (
  categoryId: number,
  data: {
    category_name: string;
    description?: string;
    status: string;
  }
) => {
  const response = await api.post(
    `/super-admin/categories/${categoryId}/service-categories/add/`,
    data
  );

  return response.data;
};

export const updateDefaultServiceCategory = async (
  categoryId: number,
  id: number,
  data: {
    category_name: string;
    description?: string;
    status: string;
  }
) => {
  const response = await api.put(
    `/super-admin/categories/${categoryId}/service-categories/update/${id}/`,
    data
  );

  return response.data;
};

export const deleteDefaultServiceCategory = async (
  categoryId: number,
  id: number
) => {
  const response = await api.delete(
    `/super-admin/categories/${categoryId}/service-categories/delete/${id}/`
  );

  return response.data;
};

export const getUsers = async (
  params?: Record<string, any>
) => {
  const response = await api.get(
    "/super-admin/users/",
    {
      params,
    }
  );

  return response.data;
};

export const getUserById = async (
  id: number | string
) => {
  const response = await api.get(
    `/super-admin/users/${id}/`
  );

  return response.data;
};

export const exportUsers = async (
  format: "csv" | "excel" | "pdf",
  params?: Record<string, any>
) => {
  const response = await api.get(
    `/super-admin/users/export/`,
    {
      params: {
        export_format: format,
        ...params,
      },
      responseType: "blob",
    }
  );

  return response.data;
};

export const getAuditLogs = async (
  params?: Record<string, any>,
  options?: { signal?: AbortSignal }
) => {
  const response = await api.get(
    "/super-admin/audit-logs/",
    {
      params,
      signal: options?.signal,
    }
  );

  return response.data;
};

export const exportAuditLogs = async (
  format: "csv" | "excel" | "pdf",
  params?: Record<string, any>
) => {
  const response = await api.get(
    `/super-admin/audit-logs/export/`,
    {
      params: {
        export_format: format,
        ...params,
      },
      responseType: "blob",
    }
  );

  return response.data;
};

export const getOrgAuditLogs = async (
  params?: Record<string, any>,
  options?: { signal?: AbortSignal }
) => {
  const response = await api.get(
    "/organization/audit-logs/",
    {
      params,
      signal: options?.signal,
    }
  );

  return response.data;
};

export const exportOrgAuditLogs = async (
  format: "csv" | "excel" | "pdf",
  params?: Record<string, any>
) => {
  const response = await api.get(
    `/organization/audit-logs/export/`,
    {
      params: {
        export_format: format,
        ...params,
      },
      responseType: "blob",
    }
  );

  return response.data;
};

export const getUserAuditHistory = async (
  username: string,
  options?: { signal?: AbortSignal }
) => {
  const response = await api.get(
    `/super-admin/audit-logs/user/${encodeURIComponent(username)}/`,
    { signal: options?.signal }
  );

  return response.data;
};

export const exportUserAuditHistory = async (
  username: string,
  format: "csv" | "excel" | "pdf"
) => {
  const response = await api.get(
    `/super-admin/audit-logs/user/${encodeURIComponent(username)}/export/`,
    {
      params: {
        export_format: format,
      },
      responseType: "blob",
    }
  );

  return response.data;
};

export const getOrgUserAuditHistory = async (
  username: string,
  options?: { signal?: AbortSignal }
) => {
  const response = await api.get(
    `/organization/audit-logs/user/${encodeURIComponent(username)}/`,
    { signal: options?.signal }
  );

  return response.data;
};

export const exportOrgUserAuditHistory = async (
  username: string,
  format: "csv" | "excel" | "pdf"
) => {
  const response = await api.get(
    `/organization/audit-logs/user/${encodeURIComponent(username)}/export/`,
    {
      params: {
        export_format: format,
      },
      responseType: "blob",
    }
  );

  return response.data;
};

export const getSubscriptions = async (
  params?: Record<string, any>
) => {
  const response = await api.get(
    "/super-admin/subscriptions/",
    {
      params,
    }
  );

  return response.data;
};

export const getSubscriptionById = async (
  id: number | string
) => {
  const response = await api.get(
    `/super-admin/subscriptions/${id}/`
  );

  return response.data;
};

export const exportSubscriptions = async (
  format: "csv" | "excel" | "pdf",
  params?: Record<string, any>
) => {
  const response = await api.get(
    `/super-admin/subscriptions/export/`,
    {
      params: {
        export_format: format,
        ...params,
      },
      responseType: "blob",
    }
  );

  return response.data;
};

export const getPlans = async (params?: { status?: string }) => {
  const response = await api.get("/super-admin/plans/", { params });
  return response.data;
};

export const getPlanById = async (
  id: number | string
) => {
  const response = await api.get(
    `/super-admin/plans/${id}/`
  );

  return response.data;
};

export const createPlan = async (
  data: any
) => {
  const response = await api.post(
    "/super-admin/plans/add/",
    data
  );

  return response.data;
};

export const updatePlan = async (
  id: number | string,
  data: any
) => {
  const response = await api.put(
    `/super-admin/plans/update/${id}/`,
    data
  );

  return response.data;
};

const BASE_PROFILE_URL =
  "/super-admin/profiles/";

export const getProfile = async () => {
  const response = await api.get(
    BASE_PROFILE_URL
  );

  return response.data;
};

export const updateProfile = async (data: {
  name?: string;
  email?: string;
  mobile?: string;
}) => {
  const response = await api.put(
    `${BASE_PROFILE_URL}update/`,
    data
  );

  return response.data;
};

export const changePassword = async (data: {
  old_password: string;
  new_password: string;
  confirm_password: string;
}) => {
  const response = await api.put(
    `${BASE_PROFILE_URL}change-password/`,
    data
  );

  return response.data;
};

const getSharedProfileBaseUrl = () => {
  const role = localStorage.getItem("role");

  if (role === "super_admin") {
    return "/super-admin/profiles/";
  }

  if (role === "employee") {
    return "/employee/profiles/";
  }

  return "/organization/profiles/";
};

export const getOrgProfile = async () => {
  const response = await api.get(
    getSharedProfileBaseUrl()
  );

  return response.data;
};

export const updateOrgProfile = async (data: {
  name?: string;
  email?: string;
  mobile?: string;
}) => {
  const response = await api.put(
    `${getSharedProfileBaseUrl()}update/`,
    data
  );

  return response.data;
};

export const changeOrgPassword = async (data: {
  old_password: string;
  new_password: string;
  confirm_password: string;
}) => {
  const response = await api.put(
    `${getSharedProfileBaseUrl()}change-password/`,
    data
  );

  return response.data;
};

export const acknowledgeFirstLogin = async () => {
  const response = await api.post(
    `${getSharedProfileBaseUrl()}acknowledge-first-login/`
  );

  return response.data;
};

export const getLandingStats = async () => {
  const response = await api.get(
    "/landing/stats/"
  );

  return response.data;
};

export const getLandingFeatures = async () => {
  const response = await api.get(
    "/landing/features/"
  );

  return response.data;
};

export const getLandingPlans = async () => {
  const response = await api.get(
    "/landing/plans/"
  );

  return response.data;
};

export interface ContactMessagePayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}
export const submitContactMessage = async (
  data: ContactMessagePayload
) => {
  const response = await api.post(
    "/dashboard/contact/",
    {
      full_name: data.name,
      email: data.email,
      subject: data.subject,
      message: data.message,
    }
  );

  return response.data;
};

export interface NewsletterSubscribePayload {
  email: string;
}

export const subscribeNewsletter = async (
  data: NewsletterSubscribePayload
) => {
  const response = await api.post(
    "/newsletter/",
    data
  );

  return response.data;
};

const AUTH_STORAGE_KEYS = [
  "access_token",
  "access",
  "refresh_token",
  "refresh",
  "role",
  "user_name",
  "name",
  "org_id",
  "org_name",
  "employee_id",
  "designation",
  "username",
  "email",
];

export const clearAuthStorage = () => {
  AUTH_STORAGE_KEYS.forEach((key) => localStorage.removeItem(key));
};

let refreshPromise: Promise<string> | null = null;

const refreshAccessToken = (refreshToken: string): Promise<string> => {
  if (!refreshPromise) {
    refreshPromise = axios
      .post(`${API_BASE_URL}/auth/token/refresh/`, { refresh: refreshToken })
      .then(({ data }) => {
        localStorage.setItem("access_token", data.access);
        return data.access as string;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

api.interceptors.response.use(
  (response) => response,

  async (error) => {
    const requestUrl: string | undefined = error.config?.url;
    const isPublic = PUBLIC_ENDPOINTS.some((url) => requestUrl?.includes(url));
    const original = error.config;

    if (error.response?.status === 401 && !isPublic && original && !original._retry) {
      original._retry = true;

      const refreshToken =
        localStorage.getItem("refresh_token") || localStorage.getItem("refresh");

      if (refreshToken) {
        try {
          const access = await refreshAccessToken(refreshToken);

          original.headers = original.headers || {};
          original.headers.Authorization = `Bearer ${access}`;

          return api(original);
        } catch (refreshError) {
          clearAuthStorage();
          window.location.href = "/login";
          return Promise.reject(refreshError);
        }
      }

      clearAuthStorage();
      window.location.href = "/login";
    }

    return Promise.reject(error);
  }
);
attachFriendlyErrorInterceptor(api);

export const requestPasswordResetOtp = (payload: { username: string }) => {
  const identifier = payload.username.trim();
  const body = identifier.includes("@") ? { email: identifier } : { username: identifier };
  return api.post("/auth/forgot-password/", body);
};

export const verifyPasswordResetOtp = (
  payload: {
    username: string;
    otp: string;
  }
) =>
  api.post(
    "/auth/verify-otp/",
    payload
  );

export const resetPassword = (
  payload: {
    username: string;
    otp: string;
    new_password: string;
    confirm_password: string;
  }
) =>
  api.post(
    "/auth/reset-password/",
    payload
  );

export default api;