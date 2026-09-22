export interface User {
  username: string
}

export interface AuthContextType {
  user: User | null
  orgId: string
  loading: boolean
  logout: () => void
}

export interface SimulationResult {
  id: number
  simulation: number
  total_customers: number
  customers_served: number
  currently_waiting: number
  left_without_service: number
  average_waiting_time: number
  maximum_waiting_time: number
  idle_time: number
  utilization: number
}

export interface SimulationTrend {
  id: number
  hour: number
  average_wait: number
  maximum_queue: number
  utilization: number
}

export interface Simulation {
  id: number
  organization: number
  arrival_probability: number
  service_probability: number
  number_of_arrivals: number
  time_horizon: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  created_by: number | null
  created_by_username: string | null
  created_at: string
  updated_at: string
  result?: SimulationResult
}

export interface SimulationDashboard {
  total_customers: number
  customers_served: number
  currently_waiting: number
  left_without_service: number
  average_waiting_time: number
  maximum_waiting_time: number
  idle_time: number
  utilization: number
  total_simulations: number
}

export interface SimulationFormData {
  arrival_probability: number
  service_probability: number
  number_of_arrivals: number
  time_horizon: number
}

export interface SimulationContextType {
  dashboard: SimulationDashboard | null
  history: Simulation[]
  loading: boolean
  error: string | null
  fetchDashboard: () => Promise<void>
  fetchHistory: (page?: number) => Promise<void>
}

export interface OrgDashboardStats {
  patients_today: number
  patients_served: number
  active_queue: number
  avg_wait_time: number
  max_wait_time: number
  queue_length: number
  employee_utilization: number
  peak_hour: string
  period_start: string
  period_end: string
}

export interface OrgTrendPoint { time: string; value: number }
export interface OrgServiceDist { name: string; value: number; pct: number; color: string }
export interface OrgEmployeeUtil { name: string; value: number }
export interface OrgPeakHour { hour: string; value: number }
export interface OrgCustomerFlow { slot: string; booked: number; served: number }
export interface OrgWaitDist { range: string; value: number }
export interface OrgQueueStatus { label: string; value: number; pct: number; color: string }

export interface OrgDashboardData {
  stats: OrgDashboardStats
  queue_length_trend: OrgTrendPoint[]
  service_distribution: OrgServiceDist[]
  wait_time_trend: OrgTrendPoint[]
  employee_utilization: OrgEmployeeUtil[]
  peak_hours: OrgPeakHour[]
  customer_flow: OrgCustomerFlow[]
  wait_distribution: OrgWaitDist[]
  queue_status: OrgQueueStatus[]
}

export interface OrgReportStatusBreakdown {
  status: string
  count: number
}

export interface OrgReportPeakHour {
  hour: string
  count: number
}

export interface OrgReportStaffPerformance {
  employee: string
  total_assigned: number
  completed: number
  cancelled: number
  completion_rate: number
}

export interface OrgReportServiceProbability {
  arrival_probability: number | null
  service_probability: number | null
  simulation_id: number | null
  simulation_status: string | null
}

export interface OrgReportDashboardAnalytics {
  patients_today: number
  patients_served: number
  active_queue: number
  queue_waiting: number
  employee_utilization: number
  peak_hour: string | null
}

export interface OrgReportCustomerFlow {
  slot: string
  booked: number
  served: number
  pending: number
}

export interface OrgReportWaitTimeTrend {
  date: string
  avg_wait_min: number
}

export interface OrgReportData {
  date_range?: { start_date: string; end_date: string }
  organization: {
    id: number
    name: string
    category: string | null
    email: string
    city: string
    state: string
    country: string
    status: string
  }
  appointment_summary: {
    total_appointments: number
    status_breakdown: OrgReportStatusBreakdown[]
  }
  peak_booking_hours: OrgReportPeakHour[]
  staff_performance: OrgReportStaffPerformance[]
  service_probability: OrgReportServiceProbability
  dashboard_analytics: OrgReportDashboardAnalytics
  customer_flow: OrgReportCustomerFlow[]
  wait_time_trend: OrgReportWaitTimeTrend[]
}
export interface ApiResponse<T> {
  success: boolean
  message: string
  data: T
}