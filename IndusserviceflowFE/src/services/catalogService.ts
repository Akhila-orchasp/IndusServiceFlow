import api from "./api";
const API = api;

export interface CatalogService {
  service_id: number;
  organization_id: number | null;
  service_name: string;
  service_type: number;
  service_type_name: string;
  duration: number;
  fee: string;
  status: "Active" | "Inactive";
}

export interface ServiceType {
  service_type_id: number;
  organization_id: number | null;
  service_type_name: string;
  description: string | null;
  status: "Active" | "Inactive";
  services_count?: number;
}

export interface CatalogEmployee {
  employee_id: number;
  org_id: number | null;
  employee_name: string;
  designation: string;
  shift: number | null;
  shift_name: string | null;
  rating: number | string | null;
  status: "Active" | "Inactive" | "On Hold";
}

export interface EmployeeServiceLink {
  employee_service_id: number;
  employee: number;
  employee_name: string;
  service: number;
  status: "Active" | "Inactive";
}

export type Pagination = {
  current_page: number;
  total_pages: number;
  total_records: number;
  page_size: number;
  has_next: boolean;
  has_previous: boolean;
};

export type PaginatedServicesResponse = {
  success: boolean;
  message: string;
  pagination: Pagination;
  data: CatalogService[];
};

export type PaginatedServiceTypesResponse = {
  success: boolean;
  message: string;
  pagination: Pagination;
  data: ServiceType[];
};

export interface ServiceSummary {
  totalServices: number;
  activeServices: number;
  inactiveServices: number;
}

export interface ServiceTypeSummary {
  totalServiceTypes: number;
  activeServiceTypes: number;
  inactiveServiceTypes: number;
}

export const getOrgServices = (orgId?: string | number) => {
  return API.get<PaginatedServicesResponse>("services/", {
    params: { ...(orgId ? { organization_id: orgId } : {}), status: "Active" },
  }).then((res) => ({ ...res, data: res.data?.data ?? [] }));
};

export const getOrgEmployees = (orgId?: string | number) => {
  return API.get<{ data: CatalogEmployee[] }>("employees/", {
    params: { ...(orgId ? { org_id: orgId } : {}), status: "Active" },
  }).then((res) => ({ ...res, data: res.data?.data ?? [] }));
};

export const getEmployeeServiceLinks = () => {
  return API.get<EmployeeServiceLink[]>("employee-services/");
};

export const getEmployeeServiceLinksForEmployee = (employeeId: number) => {
  return API.get<EmployeeServiceLink[]>(`employees/${employeeId}/services/`);
};
export const createEmployeeServiceLink = (employee: number, service: number) => {
  return API.post<EmployeeServiceLink>("employee-services/", {
    employee,
    service,
    status: "Active",
  });
};

export const updateEmployeeServiceLink = (
  employeeServiceId: number,
  payload: Partial<{ status: "Active" | "Inactive" }>
) => {
  return API.patch<EmployeeServiceLink>(`employee-services/${employeeServiceId}/`, payload);
};

export const getServices = (
  orgId?: string | number,
  params?: { search?: string; status?: string; service_type?: string | number }
) => {
  return API.get<PaginatedServicesResponse>("services/", {
    params: {
      ...(orgId ? { organization_id: orgId } : {}),
      ...params,
    },
  }).then((res) => ({ ...res, data: res.data?.data ?? [] }));
};

export const getServicesPaged = (
  orgId?: string | number,
  params?: {
    search?: string;
    status?: string;
    service_type?: string | number;
    page?: number;
    page_size?: number;
  }
) => {
  return API.get<PaginatedServicesResponse>("services/", {
    params: {
      ...(orgId ? { organization_id: orgId } : {}),
      ...params,
    },
  });
};

export const getServiceSummary = (orgId?: string | number, search?: string) => {
  return API.get<ServiceSummary>("services/summary/", {
    params: {
      ...(orgId ? { organization_id: orgId } : {}),
      ...(search ? { search } : {}),
    },
  });
};

export const createService = (payload: {
  organization_id?: string | number;
  service_name: string;
  service_type: number;
  duration: number;
  fee: string | number;
  status: "Active" | "Inactive";
}) => {
  return API.post<CatalogService>("services/", payload);
};

export const updateService = (
  serviceId: number,
  payload: Partial<{
    service_name: string;
    service_type: number;
    duration: number;
    fee: string | number;
    status: "Active" | "Inactive";
  }>
) => {
  return API.put<CatalogService>(`services/${serviceId}/`, payload);
};

export const getServiceById = (serviceId: number) => {
  return API.get<CatalogService>(`services/${serviceId}/`);
};

export const deleteService = (serviceId: number) => {
  return API.delete(`services/${serviceId}/`);
};


export const getServiceTypes = (
  orgId?: string | number,
  params?: { search?: string; status?: string }
) => {
  return API.get<PaginatedServiceTypesResponse>("service-types/", {
    params: {
      ...(orgId ? { organization_id: orgId } : {}),
      ...params,
    },
  }).then((res) => ({ ...res, data: res.data?.data ?? [] }));
};

export const getServiceTypesPaged = (
  orgId?: string | number,
  params?: { search?: string; status?: string; page?: number; page_size?: number }
) => {
  return API.get<PaginatedServiceTypesResponse>("service-types/", {
    params: {
      ...(orgId ? { organization_id: orgId } : {}),
      ...params,
    },
  });
};

export const getServiceTypeSummary = (orgId?: string | number, search?: string) => {
  return API.get<ServiceTypeSummary>("service-types/summary/", {
    params: {
      ...(orgId ? { organization_id: orgId } : {}),
      ...(search ? { search } : {}),
    },
  });
};

export const createServiceType = (payload: {
  organization_id?: string | number;
  service_type_name: string;
  description?: string;
  status: "Active" | "Inactive";
}) => {
  return API.post<ServiceType>("service-types/", payload);
};

export const updateServiceType = (
  serviceTypeId: number,
  payload: Partial<{ service_type_name: string; description: string; status: "Active" | "Inactive" }>
) => {
  return API.put<ServiceType>(`service-types/${serviceTypeId}/`, payload);
};

export const getServiceTypeById = (serviceTypeId: number) => {
  return API.get<ServiceType>(`service-types/${serviceTypeId}/`);
};

export const deleteServiceType = (serviceTypeId: number) => {
  return API.delete(`service-types/${serviceTypeId}/`);
};

export type ExportFormat = "csv" | "excel" | "pdf";

const EXPORT_PATH: Record<ExportFormat, string> = {
  csv: "export-csv",
  excel: "export-excel",
  pdf: "export-pdf",
};

const EXPORT_EXTENSION: Record<ExportFormat, string> = {
  csv: "csv",
  excel: "xlsx",
  pdf: "pdf",
};

const downloadBlob = async (
  resource: "services" | "service-types",
  format: ExportFormat,
  filenameBase: string,
  orgId?: string | number,
  params?: Record<string, string | number | undefined>
) => {
  const response = await API.get(`${resource}/${EXPORT_PATH[format]}/`, {
    params: {
      ...(orgId ? { organization_id: orgId } : {}),
      ...params,
    },
    responseType: "blob",
  });

  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${filenameBase}.${EXPORT_EXTENSION[format]}`);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

export const exportServices = (
  format: ExportFormat,
  orgId?: string | number,
  params?: { search?: string; status?: string; service_type?: string | number }
) => downloadBlob("services", format, "services", orgId, params);

export const exportServiceTypes = (
  format: ExportFormat,
  orgId?: string | number,
  params?: { search?: string; status?: string }
) => downloadBlob("service-types", format, "service-categories", orgId, params);

export default API;