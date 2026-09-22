import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { simulationApi } from '../api/simulationApi'
import { useAuth } from './AuthContext'
import type { SimulationContextType, SimulationDashboard, Simulation } from '../types'

const SimulationContext = createContext<SimulationContextType | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const { orgId } = useAuth()
  const [dashboard, setDashboard] = useState<SimulationDashboard | null>(null)
  const [history, setHistory] = useState<Simulation[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    const resolvedOrgId = orgId || localStorage.getItem('org_id') || ''
    if (!resolvedOrgId) return
    setLoading(true)
    setError(null)
    try {
      const { data } = await simulationApi.getDashboard(resolvedOrgId)
      setDashboard(data.data)
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  const fetchHistory = useCallback(async (page = 1) => {
    const resolvedOrgId = orgId || localStorage.getItem('org_id') || ''
    if (!resolvedOrgId) return
    setLoading(true)
    try {
      const { data } = await simulationApi.getHistory(resolvedOrgId, page)
      setHistory(data.results ?? data.data ?? [])
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setError(err.response?.data?.message ?? 'Failed to load history')
    } finally {
      setLoading(false)
    }
  }, [orgId])

  return (
    <SimulationContext.Provider value={{ dashboard, history, loading, error, fetchDashboard, fetchHistory }}>
      {children}
    </SimulationContext.Provider>
  )
}
export const useSimulation = (): SimulationContextType => {
  const ctx = useContext(SimulationContext)
  if (!ctx) throw new Error('useSimulation must be used within SimulationProvider')
  return ctx
}
