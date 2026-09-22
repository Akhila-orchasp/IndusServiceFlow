import api from '../services/api'
import type { SimulationFormData } from '../types'

const orgParam = (orgId: string) => ({ params: { org_id: orgId } })

export const simulationApi = {
  getDashboard: (orgId: string) =>
    api.get('/simulation/dashboard/', orgParam(orgId)),

  runSimulation: (payload: SimulationFormData & { organization_id: number }) =>
    api.post('/simulation/run/', payload),

  getResult: (id: number, orgId: string) =>
    api.get(`/simulation/result/${id}/`, orgParam(orgId)),

  getTrend: (id: number, orgId: string) =>
    api.get(`/simulation/trend/${id}/`, orgParam(orgId)),

  getHistory: (orgId: string, page = 1) =>
    api.get('/simulation/history/', { params: { org_id: orgId, page } }),

  getHistoryDetail: (id: number, orgId: string) =>
    api.get(`/simulation/history/${id}/`, orgParam(orgId)),

  exportPDF: (id: number, orgId: string) =>
    api.get(`/simulation/export/pdf/${id}/`, {
      params: { org_id: orgId },
      responseType: 'blob' as const,
    }),

  exportExcel: (id: number, orgId: string) =>
    api.get(`/simulation/export/excel/${id}/`, {
      params: { org_id: orgId },
      responseType: 'blob' as const,
    }),

  exportCSV: (id: number, orgId: string) =>
    api.get(`/simulation/export/csv/${id}/`, {
      params: { org_id: orgId },
      responseType: 'blob' as const,
    }),
}