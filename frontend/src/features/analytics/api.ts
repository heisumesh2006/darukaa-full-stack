import { api } from '../../services/api'
import { sitePath } from '../sites/api'
import type { SiteAnalyticsData } from './types'

export async function getSiteAnalytics(
  projectId: string,
  siteId: string,
  signal?: AbortSignal,
) {
  return (
    await api.get<SiteAnalyticsData>(
      `${sitePath(projectId, siteId)}/analytics`,
      { signal },
    )
  ).data
}
