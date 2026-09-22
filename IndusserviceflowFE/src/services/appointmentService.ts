import api from "./api";
const API = api;

export type AppointmentStatus =
  | "Confirmed"
  | "Waiting"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "No Show"
  | "Left Queue";

export interface AppointmentServiceLine {
  appointment_service_id: number;
  service: number;
  service_name: string;
  employee: number | null;
  employee_name: string | null;
  duration_min: number;
  fee: string;
  status: string;
  start_time: string | null;
}

export interface Appointment {
  appointment_id: number;
  appointment_number: string;
  token_number: string;
  org_id: number | null;
  customer: number;
  customer_name: string;
  customer_mobile: string;
  customer_email: string | null;
  date: string;
  time: string;
  status: AppointmentStatus;
  total_fee: string;
  total_duration_min: number;
  remarks: string | null;
  is_active: boolean;
  services: AppointmentServiceLine[];
  created_by: string;
  created_on: string;
  updated_by: string | null;
  updated_on: string;
}

export interface AppointmentStatusBreakdown {
  status: AppointmentStatus;
  label: string;
  count: number;
}

export interface AppointmentSummary {
  totalAppointments: number;
  totalRevenue: string;
  todayAppointments: number;
  todayRevenue: string;
  upcomingAppointments: number;
  statusBreakdown: AppointmentStatusBreakdown[];
}

export interface AppointmentListParams {
  status?: string; 
  date?: string;
  from_date?: string;
  to_date?: string;
  search?: string;
  type?: "Scheduled" | "Walk-in";
  page?: number;
  page_size?: number;
  sort_by?: "token_number" | "customer_name" | "date" | "time";
  sort_dir?: "asc" | "desc";
}

export type Pagination = {
  current_page: number;
  total_pages: number;
  total_records: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type PaginatedAppointmentsResponse = {
  success: boolean;
  message: string;
  pagination: Pagination;
  data: Appointment[];
};

export const getAppointments = (orgId?: string | number, params: AppointmentListParams = {}) => {
  return API.get<PaginatedAppointmentsResponse>("appointments/", {
    params: {
      ...(orgId ? { org_id: orgId } : {}),
      ...params,
    },
  });
};

export const getAppointmentSummary = (orgId?: string | number) => {
  return API.get<AppointmentSummary>("appointments/summary/", {
    params: orgId ? { org_id: orgId } : {},
  });
};

export const getAppointmentType = (appointment: Pick<Appointment, "remarks">): "Scheduled" | "Walk-in" => {
  return appointment.remarks && /walk[\s-]?in/i.test(appointment.remarks) ? "Walk-in" : "Scheduled";
};

const downloadExport = async (
  path: "export-csv" | "export-excel" | "export-pdf",
  filename: string,
  orgId?: string | number,
  params: AppointmentListParams = {}
) => {
  const response = await API.get(`appointments/${path}/`, {
    params: {
      ...(orgId ? { org_id: orgId } : {}),
      ...params,
    },
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportAppointmentsCsv = (orgId?: string | number, params?: AppointmentListParams) =>
  downloadExport("export-csv", "appointments.csv", orgId, params);

export const exportAppointmentsExcel = (orgId?: string | number, params?: AppointmentListParams) =>
  downloadExport("export-excel", "appointments.xlsx", orgId, params);

export const exportAppointmentsPdf = (orgId?: string | number, params?: AppointmentListParams) =>
  downloadExport("export-pdf", "appointments.pdf", orgId, params);

// ---------- Create / update / cancel ----------
export interface CreateAppointmentServiceItem {
  service_id: number;
  employee_id?: number | null;
}

export interface CreateAppointmentPayload {
  org_id: string | number;
  customer_name: string;
  mobile: string;
  email?: string;
  gender?: "Male" | "Female" | "Other";
  date: string; 
  time: string; 
  remarks?: string;
  services: CreateAppointmentServiceItem[];
}

export interface CreateAppointmentResponse {
  message: string;
  appointment_id: number;
  appointment_number: string;
  token_number: string;
  email_status: string;
  data: Appointment;
}

export const createAppointment = (payload: CreateAppointmentPayload) => {
  return API.post<CreateAppointmentResponse>("appointments/", payload);
};

export const updateAppointmentStatus = (appointmentId: number, nextStatus: AppointmentStatus) => {
  return API.patch<{ message: string; data: Appointment }>(`appointments/${appointmentId}/`, {
    status: nextStatus,
  });
};

export const cancelAppointment = (appointmentId: number) => {
  return API.delete<{ message: string }>(`appointments/${appointmentId}/`);
};

// ---------- Available slots ----------
export interface AvailableSlotsResponse {
  date: string;
  available_slots: string[];
}

export const getAvailableSlotsForAssignments = (
  orgId: string | number,
  date: string,
  assignments: { service_id: number; employee_id: number }[]
) => {
  return API.get<AvailableSlotsResponse>("appointments/available-slots/", {
    params: {
      org_id: orgId,
      date,
      assignments: JSON.stringify(assignments),
    },
  });
};

export const getAvailableSlotsForServices = (
  orgId: string | number,
  date: string,
  serviceIds: number[]
) => {
  return API.get<AvailableSlotsResponse>("appointments/available-slots/", {
    params: {
      org_id: orgId,
      date,
      service_ids: serviceIds.join(","),
    },
  });
};

export default API;