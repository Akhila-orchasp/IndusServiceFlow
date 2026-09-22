import api from "./api";
const API = api;
export type Employee = {
    employee_id: number;
    employee_code: string;
    org_id?: number | null;
    shift?: number | null;
    shift_name?: string | null;
    shift_start_time?: string | null;
    shift_end_time?: string | null;
    // "no_shift" | "not_started" | "on_shift" | "ended"
    shift_status?: "no_shift" | "not_started" | "on_shift" | "ended";
    rating?: number | string | null;
    username: string;
    employee_name: string;
    designation: string;
    mobile: string;
    email: string;
    status: "Active" | "On Hold" | "Inactive";
    service_ids?: number[];
    is_available_now?: boolean;
    currently_serving_customer?: string | null;
    created_by?: string;
    created_on?: string;
    updated_by?: string;
    updated_on?: string;
};

export type Shift = {
    shift_id: number;
    shift_name: string;
    start_time?: string;
    end_time?: string;
    break_start?: string | null;
    break_end?: string | null;
    status?: "Active" | "Inactive";
    duration_hours?: number;
    employee_count?: number;
};

export type Pagination = {
    current_page: number;
    total_pages: number;
    total_records: number;
    page_size: number;
    has_next: boolean;
    has_previous: boolean;
};

export type PaginatedEmployeesResponse = {
    success: boolean;
    message: string;
    pagination: Pagination;
    data: Employee[];
};

export const getShifts = (
    orgId?: string | number,
    pageSize?: number,
    page?: number,
    params?: { search?: string; status?: string }
) => {
    return API.get<Shift[] | ListEnvelope<Shift>>("shifts/", {
        params: {
            ...(orgId ? { org_id: orgId } : {}),
            page_size: pageSize ?? 9,
            page: page ?? 1,
            ...params,
        },
    });
};

export const getAllShifts = (orgId?: string | number) => getShifts(orgId, 1000);
export type ListEnvelope<T> = {
    success: boolean;
    message: string;
    pagination?: Pagination;
    data: T[];
};

export const unwrapList = <T,>(payload: T[] | ListEnvelope<T> | undefined | null): T[] => {
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray((payload as ListEnvelope<T>).data)) {
        return (payload as ListEnvelope<T>).data;
    }
    return [];
};

export type ShiftPayload = {
    shift_name: string;
    start_time: string;
    end_time: string;
    break_start?: string | null;
    break_end?: string | null;
    status?: "Active" | "Inactive";
    duration_hours?: number;
};

export const createShift = (payload: ShiftPayload) => {
    return API.post<Shift>("shifts/", payload);
};

export const updateShift = (shiftId: number, payload: Partial<ShiftPayload>) => {
    return API.put<Shift>(`shifts/${shiftId}/`, payload);
};

export const deleteShift = (shiftId: number) => {
    return API.delete<{ message: string }>(`shifts/${shiftId}/`);
};

export const getEmployees = (
    orgId?: string | number,
    params?: {
        search?: string;
        status?: string;
        shift?: string | number;
        page?: number;
        page_size?: number;
    }
) => {
    return API.get<PaginatedEmployeesResponse>("employees/", {
        params: {
            ...(orgId ? { org_id: orgId } : {}),
            ...params,
        },
    });
};

export const getEmployeeSummary = (orgId?: string | number) => {
    return API.get("employees/summary/", {
        params: orgId ? { org_id: orgId } : {},
    });
};

export const getEmployeeById = (employeeId: number) => {
    return API.get<Employee>(`employees/${employeeId}/`);
};

export const createEmployee = (payload: {
    org_id?: string | number;
    employee_name: string;
    designation: string;
    mobile: string;
    email: string;
    username?: string;
    password?: string;
    shift?: number | null;
    status: "Active" | "On Hold" | "Inactive";
}) => {
    return API.post<Employee>("employees/", payload);
};

export const updateEmployee = (
    employeeId: number,
    payload: Partial<{
        employee_name: string;
        designation: string;
        mobile: string;
        email: string;
        username: string;
        password: string;
        shift: number | null;
        status: "Active" | "On Hold" | "Inactive";
    }>
) => {
    return API.put<Employee>(`employees/${employeeId}/`, payload);
};

export const setEmployeeStatus = (employeeId: number, status: string) => {
    return API.patch(`employees/${employeeId}/`, { status });
};

export const deleteEmployee = (employeeId: number) => {
    return API.delete(`employees/${employeeId}/`);
};


const downloadEmployeesExport = async (
    path: "export-csv" | "export-excel" | "export-pdf",
    filename: string,
    orgId?: string | number,
    params?: { search?: string; status?: string }
) => {
    const response = await API.get(`employees/${path}/`, {
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

    return response;
};

export const exportEmployeesCsv = (
    orgId?: string | number,
    params?: { search?: string; status?: string }
) => downloadEmployeesExport("export-csv", "employees.csv", orgId, params);

export const exportEmployeesExcel = (
    orgId?: string | number,
    params?: { search?: string; status?: string }
) => downloadEmployeesExport("export-excel", "employees.xlsx", orgId, params);

export const exportEmployeesPdf = (
    orgId?: string | number,
    params?: { search?: string; status?: string }
) => downloadEmployeesExport("export-pdf", "employees.pdf", orgId, params);
export type ApiEnvelope<T> = {
    success: boolean;
    message: string;
    data: T;
    pagination?: Pagination;
};

export const unwrapEnvelope = <T,>(payload: ApiEnvelope<T> | T): T => {
    if (payload && typeof payload === "object" && "data" in (payload as any) && "success" in (payload as any)) {
        return (payload as ApiEnvelope<T>).data;
    }
    return payload as T;
};

// ---------- Dashboard ----------

export type AssignedService = {
    appointment_id: number;
    appointment_number?: string;
    token_number: string;
    customer_name: string;
    service_name: string;
    time: string;
    appointment_status: string;
    service_status: string;
};

export type EmployeeDashboard = {
    customers_served_today: number;
    customers_waiting: number;
    average_handling_time: number;
    completed_services_today: number;
    in_progress_services: number;
    upcoming_appointments_today: number;
    assigned_services_today: AssignedService[];
    shift: {
        shift_id?: number;
        shift_name: string;
        start_time: string;
        end_time: string;
        break_start?: string | null;
        break_end?: string | null;
        status: string;
    } | null;
};

export const getEmployeeDashboard = (employeeId: string | number) => {
    return API.get<ApiEnvelope<EmployeeDashboard>>(`employees/${employeeId}/dashboard/`);
};

export type QueueEnvelopeData = {
    current_customer: {
        appointment_id: number;
        appointment_number?: string;
        token_number: string;
        customer_name: string;
        service_id?: number;
        service_name: string;
        appointment_status: string;
        started_at?: string;
        service_duration_minutes?: number;
    } | null;
    next_waiting_customers: Array<{
        appointment_id: number;
        appointment_number?: string;
        token_number: string;
        customer_name: string;
        service_id?: number;
        service_name: string;
        appointment_status: string;
        queue_position: number;
        service_duration_minutes?: number;
    }>;
};

export const getMyQueue = (
    employeeId: string | number,
    params?: { page?: number; page_size?: number }
) => {
    return API.get<ApiEnvelope<QueueEnvelopeData>>(`employees/${employeeId}/my-queue/`, {
        params,
    });
};

export const callNextCustomer = (employeeId: string | number) => {
    return API.post<ApiEnvelope<{
        appointment_id: number;
        appointment_number?: string;
        token_number: string;
        customer_name: string;
        status: string;
    }>>(`employees/${employeeId}/call-next/`);
};

export const completeCustomer = (
    employeeId: string | number,
    appointmentId: number,
    remarks?: string
) => {
    return API.post<ApiEnvelope<{
        appointment_id: number;
        service_id: number;
        service_status: string;
        status: string;
    }>>(`employees/${employeeId}/complete-customer/`, {
        appointment_id: appointmentId,
        remarks: remarks || "",
    });
};

export const skipCustomer = (employeeId: string | number, appointmentId: number) => {
    return API.post<ApiEnvelope<{
        appointment_id: number;
        service_id: number;
        service_status: string;
        status: string;
    }>>(`employees/${employeeId}/skip-customer/`, {
        appointment_id: appointmentId,
    });
};

export const rescheduleCustomer = (
    employeeId: string | number,
    appointmentId: number,
    date: string,
    time: string
) => {
    return API.post<ApiEnvelope<{
        appointment_id: number;
        date: string;
        time: string;
        status: string;
    }>>(`employees/${employeeId}/reschedule-customer/`, {
        appointment_id: appointmentId,
        date,
        time,
    });
};

export const transferCustomer = (
    employeeId: string | number,
    appointmentId: number,
    targetEmployeeId: number,
    force?: boolean
) => {
    return API.post<ApiEnvelope<{
        appointment_id: number;
        transferred_to_employee_id: number;
        status: string;
    }>>(`employees/${employeeId}/transfer-customer/`, {
        appointment_id: appointmentId,
        employee_id: targetEmployeeId,
        ...(force ? { force: true } : {}),
    });
};

export type EmployeeScheduleData = {
    shift: {
        shift_id?: number;
        shift_name: string;
        start_time: string;
        end_time: string;
        break_start?: string | null;
        break_end?: string | null;
        duration_hours?: number;
        status: string;
    } | null;
    appointments_today: Array<{
        appointment_id: number;
        appointment_number?: string;
        token_number: string;
        time: string;
        customer_name: string;
        service_name: string;
        appointment_status: string;
        service_status: string;
    }>;
};

export const getEmployeeSchedule = (
    employeeId: string | number,
    params?: { page?: number; page_size?: number }
) => {
    return API.get<ApiEnvelope<EmployeeScheduleData>>(`employees/${employeeId}/schedule/`, {
        params,
    });
};

export type EmployeePerformance = {
    total_customers_served: number;
    customers_served_today: number;
    average_service_duration: number;
    completion_rate: number;
    cancelled_count: number;
    no_show_count: number;
    left_queue_count: number;
    total_assigned_appointments: number;
    completed_appointments: number;
    rating: number | string | null;
};

export const getEmployeePerformance = (employeeId: string | number) => {
    return API.get<ApiEnvelope<EmployeePerformance>>(`employees/${employeeId}/performance/`);
};

export const resolveShiftEndQueue = (employeeId: string | number) => {
    return API.post<ApiEnvelope<{ left_queue_count: number }>>(
        `employees/${employeeId}/resolve-shift-end/`
    );
};

export const getEmployeesList = (
    orgId?: string | number,
    options?: { serviceId?: number | string; availableOnly?: boolean }
) => {
    return API.get<PaginatedEmployeesResponse>("employees/", {
        params: {
            ...(orgId ? { org_id: orgId } : {}),
            status: "Active",
            ...(options?.serviceId ? { service_id: options.serviceId } : {}),
            ...(options?.availableOnly ? { available_only: true } : {}),
        },
    });
};

export const searchCustomers = (query: string, orgId?: string | number) => {
    return API.get("customers/", {
        params: {
            search: query,
            ...(orgId ? { OrganizationId: orgId } : {}),
        },
    });
};

export const searchAppointments = (query: string, orgId?: string | number) => {
    return API.get("appointments/", {
        params: {
            search: query,
            page_size: 5,
            ...(orgId ? { org_id: orgId } : {}),
        },
    });
};

export const getOrganizationById = (orgId: string | number) => {
    return API.get(`super-admin/organizations/${orgId}/`);
};

export default API;