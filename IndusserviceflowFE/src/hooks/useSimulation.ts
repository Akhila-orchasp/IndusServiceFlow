import { useState, useCallback } from 'react'
import { simulationApi } from '../api/simulationApi'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'
import type { SimulationResult, SimulationTrend, SimulationFormData, Simulation } from '../types'

export function useRunSimulation() {
  const { orgId } = useAuth()
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [trends, setTrends] = useState<SimulationTrend[]>([])

  const run = useCallback(async (formData: SimulationFormData): Promise<Simulation> => {
    setRunning(true)
    setResult(null)
    setTrends([])
    try {
      const resolvedOrgId = Number(orgId) || Number(localStorage.getItem('org_id')) || 0
      if (!resolvedOrgId) {
        toast.error('Organization ID not found. Please login again.')
        throw new Error('Missing org_id')
      }
      const payload = { ...formData, organization_id: resolvedOrgId }
      const { data } = await simulationApi.runSimulation(payload)
      const sim: Simulation = data.data
      setResult(sim.result ?? null)

      const resolvedOrgStr = String(resolvedOrgId)
      const trendRes = await simulationApi.getTrend(sim.id, resolvedOrgStr)
      setTrends(trendRes.data.data ?? [])
      toast.success('Simulation completed!')
      return sim
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      const msg = err.response?.data?.message ?? 'Simulation failed'
      toast.error(msg)
      throw e
    } finally {
      setRunning(false)
    }
  }, [orgId])

  return { run, running, result, trends }
}

export function useExport() {
  const { orgId } = useAuth()

  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const exportPDF = async (id: number) => {
    try {
      const { data } = await simulationApi.exportPDF(id, orgId)
      downloadBlob(data as Blob, `simulation_${id}.pdf`)
      toast.success('PDF downloaded')
    } catch {
      toast.error('PDF export failed')
    }
  }

  const exportExcel = async (id: number) => {
    try {
      const { data } = await simulationApi.exportExcel(id, orgId)
      downloadBlob(data as Blob, `simulation_${id}.xlsx`)
      toast.success('Excel downloaded')
    } catch {
      toast.error('Excel export failed')
    }
  }

  return { exportPDF, exportExcel }
}
