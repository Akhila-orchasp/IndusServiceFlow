import api from "./api";
const API = api;


export type QueueAppointmentStatus =
  | "Confirmed"
  | "Waiting"
  | "In Progress"
  | "Completed"
  | "Cancelled"
  | "No Show"
  | "Left Queue";

export interface QueueSummary {
  total_waiting: number;
  currently_serving: number;
  completed_today: number;
  active_services: number;
}

export interface QueueCurrentlyServing {
  employee_name: string | null;
  customer_name: string | null;
  token_number: string | null;
}

export interface ActiveQueue {
  service_id: number;
  service_name: string;
  waiting_count: number;
  currently_serving: QueueCurrentlyServing;
}

export interface LiveQueueRow {
  appointment_id: number;
  appointment_number: string;
  token_number: string;
  customer_name: string;
  service_name: string;
  employee_name: string | null;
  status: QueueAppointmentStatus;
}

export interface QueueServiceOption {
  service_id: number;
  service_name: string;
}

export interface LiveQueueParams {
  search?: string;
  status?: string;
  service_id?: number | string;
  employee_id?: number | string;
  page?: number;
  page_size?: number;
}

export type Pagination = {
  current_page: number;
  total_pages: number;
  total_records: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type PaginatedLiveQueueResponse = {
  success: boolean;
  message: string;
  pagination: Pagination;
  data: LiveQueueRow[];
};

const withOrg = (
  orgId?: string | number,
  params: Record<string, unknown> | LiveQueueParams = {}
) => ({
  ...(orgId ? { org_id: orgId } : {}),
  ...params,
});

export const getQueueSummary = (orgId?: string | number) =>
  API.get<QueueSummary>("queue-management/summary/", { params: withOrg(orgId) });

export const getActiveQueues = (orgId?: string | number) =>
  API.get<ActiveQueue[]>("queue-management/active-queues/", { params: withOrg(orgId) });

export const getLiveQueue = (orgId?: string | number, params: LiveQueueParams = {}) =>
  API.get<PaginatedLiveQueueResponse>("queue-management/live-queue/", { params: withOrg(orgId, params) });

export const getQueueServices = (orgId?: string | number) =>
  API.get<QueueServiceOption[]>("queue-management/services/", { params: withOrg(orgId) });

export const getQueueStatuses = () => API.get<QueueAppointmentStatus[]>("queue-management/statuses/");

const downloadQueueExport = async (
  path: "export-csv" | "export-excel" | "export-pdf",
  filename: string,
  orgId?: string | number
) => {
  const response = await API.get(`queue-management/${path}/`, {
    params: withOrg(orgId),
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

const todayStamp = () => new Date().toISOString().slice(0, 10);

export const exportQueueCsv = (orgId?: string | number) =>
  downloadQueueExport("export-csv", `queue_${todayStamp()}.csv`, orgId);

export const exportQueueExcel = (orgId?: string | number) =>
  downloadQueueExport("export-excel", `queue_${todayStamp()}.xlsx`, orgId);

export const exportQueuePdf = (orgId?: string | number) =>
  downloadQueueExport("export-pdf", `queue_${todayStamp()}.pdf`, orgId);

export default API;