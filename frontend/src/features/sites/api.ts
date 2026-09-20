import { api } from '../../services/api'
import type { Site, SiteInput } from './types'

export const sitePath = (projectId: string, siteId?: string) =>
  `/projects/${encodeURIComponent(projectId)}/sites${siteId ? `/${encodeURIComponent(siteId)}` : ''}`
export async function listSites(projectId: string, signal?: AbortSignal) {
  return (await api.get<Site[]>(sitePath(projectId), { signal })).data
}
export async function getSite(
  projectId: string,
  siteId: string,
  signal?: AbortSignal,
) {
  return (await api.get<Site>(sitePath(projectId, siteId), { signal })).data
}
export async function createSite(projectId: string, input: SiteInput) {
  return (await api.post<Site>(sitePath(projectId), input)).data
}
export async function updateSite(
  projectId: string,
  siteId: string,
  input: Partial<SiteInput>,
) {
  return (await api.patch<Site>(sitePath(projectId, siteId), input)).data
}
export async function deleteSite(projectId: string, siteId: string) {
  await api.delete(sitePath(projectId, siteId))
}
