import axios from "axios";
import { API_BASE_URL, attachFriendlyErrorInterceptor, parseBlobErrorMessage } from "./api";
import type {
  CatalogService,
  CatalogEmployee,
  EmployeeServiceLink,
} from "./catalogService";
import type {
  CreateAppointmentPayload,
  CreateAppointmentResponse,
  AvailableSlotsResponse,
} from "./appointmentService";

// Authenticated client — used ONLY for Org Admin screens (dashboard,
// reports) that must act on the logged-in admin's own organization.
const API = axios.create({
  baseURL: API_BASE_URL,
});
API.interceptors.request.use(
  (config) => {
    const token =
      localStorage.getItem("access_token") ||
      localStorage.getItem("access");

    if (token) {
      config.headers = config.headers ?? {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Public client — used for the public "Book appointment" flow.
// IMPORTANT: this must never attach an Authorization header. The
// backend's services/employees list endpoints give an authenticated
// caller's own organization priority over any organization_id/org_id
// query param (so an Org Admin can't be tricked into viewing another
// org's data). If a visitor's browser still has an admin/employee
// token sitting in localStorage from an earlier session, sending it
// here would silently force every public booking request back to
// that admin's organization, no matter which org/category the
// visitor actually picked. Keeping this client token-free guarantees
// the public flow always behaves as a true anonymous visitor.
const PublicAPI = axios.create({
  baseURL: API_BASE_URL,
});

// Both clients previously had no response interceptor at all, so a failed
// call here (dashboard/report fetches, or the public booking flow) fell
// straight through to axios's raw "Request failed with status code
// 400/500" instead of a real message. This gives both the same
// friendly-message normalization the main `api` instance has.
attachFriendlyErrorInterceptor(API);
attachFriendlyErrorInterceptor(PublicAPI);

export interface OrganizationCategory {
  id: number;
  category_name: string;
  status: string;
}

export interface PublicOrganization {
  id?: number;
  org_id?: number;
  organization_name: string;
  category?: number;
  category_name?: string;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  status?: string;
}

export const getOrgId = (org: PublicOrganization): number =>
  Number(org.org_id ?? org.id ?? 0);

export const getOrganizationCategories = () =>
  PublicAPI.get<{ data: OrganizationCategory[] }>("categories/").then((res) => ({
    ...res,
    data: res.data?.data ?? [],
  }));

export const getOrganizationsByCategory = (
  categoryId: string | number
) =>
  PublicAPI.get<{ data: PublicOrganization[] }>("organizations/", {
    params: {
      category: categoryId,
      status: "Active",
    },
  }).then((res) => ({
    ...res,
    data: res.data?.data ?? [],
  }));

export const getPublicOrgServices = (orgId: string | number) =>
  PublicAPI.get<{ data: CatalogService[] }>("services/", {
    params: {
      organization_id: orgId,
      status: "Active",
    },
  }).then((res) => ({
    ...res,
    data: res.data?.data ?? [],
  }));

export const getPublicOrgEmployees = (orgId: string | number) =>
  PublicAPI.get<{ data: CatalogEmployee[] }>("employees/", {
    params: {
      org_id: orgId,
      status: "Active",
    },
  }).then((res) => ({
    ...res,
    data: res.data?.data ?? [],
  }));
export const getPublicEmployeeServiceLinks = (orgId: string | number) =>
  PublicAPI.get<EmployeeServiceLink[]>("employee-services/", {
    params: {
      org_id: orgId,
    },
  });

export const getPublicAvailableSlots = (
  orgId: string | number,
  date: string,
  serviceIds: number[]
) =>
  PublicAPI.get<AvailableSlotsResponse>("appointments/available-slots/", {
    params: {
      org_id: orgId,
      date,
      service_ids: serviceIds.join(","),
    },
  });

export const createPublicAppointment = (
  payload: CreateAppointmentPayload
) => PublicAPI.post<CreateAppointmentResponse>("appointments/", payload);

export const getOrgDashboard = (orgId: string | number) =>
  API.get("organizations/dashboard/", {
    params: {
      org_id: orgId,
    },
  });

export const getOrgReport = (
  orgId: string | number,
  params: { from_date?: string; to_date?: string } = {}
) =>
  API.get(`reports/organization/${orgId}/`, {
    params: {
      export_format: "json",
      ...params,
    },
  });

export const exportOrgReport = async (
  orgId: string | number,
  format: "csv" | "excel" | "pdf",
  params: { from_date?: string; to_date?: string } = {}
) => {
  const response = await API.get(`reports/organization/${orgId}/`, {
    params: {
      export_format: format,
      ...params,
    },
    responseType: "blob",
  });

  const blob: Blob = response.data;

  if (format === "pdf" && blob.type !== "application/pdf") {
    throw new Error(await parseBlobErrorMessage(blob, "Couldn't generate the PDF report. Please try again."));
  }
  if (blob.type.includes("json") || blob.type.includes("text/html")) {
    throw new Error(await parseBlobErrorMessage(blob, "Couldn't generate the report export. Please try again."));
  }

  return blob;
};

export default API;