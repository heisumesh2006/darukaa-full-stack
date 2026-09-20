import { api } from '../../services/api'
import type { DashboardData } from './types'

export async function getDashboard(signal: AbortSignal) {
  return (await api.get<DashboardData>('/dashboard/summary', { signal })).data
}
