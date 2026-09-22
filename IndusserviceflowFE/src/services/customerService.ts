import type { Appointment } from "./appointmentService";
import api from "./api";
const API = api;

export interface Customer {
  CustomerId: number;
  OrganizationId: number | null;
  CustomerName: string;
  Mobile: string;
  Email: string | null;
  Gender: "Male" | "Female" | "Other" | null;
  CreatedBy: string;
  CreatedOn: string;
  UpdatedBy: string | null;
  UpdatedOn: string;
}

export interface CustomerSummary {
  totalCustomers: number;
  newCustomersThisMonth: number;
  customersAddedToday: number;
  customersThisMonth: number;
  waiting: number;
  inService: number;
  served: number;
}

export type Pagination = {
  current_page: number;
  total_pages: number;
  total_records: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type PaginatedCustomersResponse = {
  success: boolean;
  message: string;
  pagination: Pagination;
  data: Customer[];
};

export interface CustomerHistoryStats {
  totalAppointments: number;
  completed: number;
  cancelled: number;
  noShow: number;
  totalSpent: number;
  firstVisit: string | null;
  lastVisit: string | null;
}
 
export interface CustomerHistory {
  customer: Customer; 
  stats: CustomerHistoryStats;
  appointments: Appointment[];
}
 
export const getCustomerHistory = (customerId: number) =>
  API.get<CustomerHistory>(`customers/${customerId}/history/`);

const downloadHistoryExport = async (
  customerId: number,
  path: "export-csv" | "export-excel" | "export-pdf",
  filename: string
) => {
  const response = await API.get(`customers/${customerId}/history/${path}/`, {
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

export const exportCustomerHistoryCsv = (customerId: number, customerName: string) =>
  downloadHistoryExport(customerId, "export-csv", `${customerName}_history.csv`);

export const exportCustomerHistoryExcel = (customerId: number, customerName: string) =>
  downloadHistoryExport(customerId, "export-excel", `${customerName}_history.xlsx`);

export const exportCustomerHistoryPdf = (customerId: number, customerName: string) =>
  downloadHistoryExport(customerId, "export-pdf", `${customerName}_history.pdf`);

export const getCustomers = (
  orgId?: string | number,
  params?: {
    search?: string;
    status?: string;
    page?: number;
    page_size?: number;
  }
) => {
  return API.get<PaginatedCustomersResponse>("customers/", {
    params: {
      ...(orgId ? { OrganizationId: orgId } : {}),
      ...params,
    },
  });
};

export const getCustomerSummary = (orgId?: string | number, search?: string) => {
  return API.get<CustomerSummary>("customers/summary/", {
    params: {
      ...(orgId ? { OrganizationId: orgId } : {}),
      ...(search ? { search } : {}),
    },
  });
};


const downloadExport = async (
  path: "export-csv" | "export-excel" | "export-pdf",
  filename: string,
  orgId?: string | number,
  search?: string
) => {
  const response = await API.get(`customers/${path}/`, {
    params: {
      ...(orgId ? { OrganizationId: orgId } : {}),
      ...(search ? { search } : {}),
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

export const exportCustomersCsv = (orgId?: string | number, search?: string) =>
  downloadExport("export-csv", "customers.csv", orgId, search);

export const exportCustomersExcel = (orgId?: string | number, search?: string) =>
  downloadExport("export-excel", "customers.xlsx", orgId, search);

export const exportCustomersPdf = (orgId?: string | number, search?: string) =>
  downloadExport("export-pdf", "customers.pdf", orgId, search);

export default API;