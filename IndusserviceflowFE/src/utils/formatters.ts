export const formatNumber = (n: number | null | undefined, decimals = 2): string =>
  n == null ? '—' : Number(n).toFixed(decimals)

export const formatPercent = (n: number | null | undefined): string =>
  n == null ? '—' : `${Number(n).toFixed(1)}%`

export const formatDate = (iso: string | null | undefined): string => {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export const statusColor = (status: string): string => {
  const map: Record<string, string> = {
    completed: '#22c55e',
    running: '#3b82f6',
    pending: '#f59e0b',
    failed: '#ef4444',
  }
  return map[status] ?? '#6b7280'
}
