import { api } from '../../services/api'
import type { Project, ProjectInput } from './types'

export async function listProjects(signal?: AbortSignal) {
  return (await api.get<Project[]>('/projects', { signal })).data
}
export async function getProject(id: string, signal?: AbortSignal) {
  return (
    await api.get<Project>(`/projects/${encodeURIComponent(id)}`, { signal })
  ).data
}
export async function createProject(input: ProjectInput) {
  return (await api.post<Project>('/projects', input)).data
}
export async function updateProject(id: string, input: Partial<ProjectInput>) {
  return (
    await api.patch<Project>(`/projects/${encodeURIComponent(id)}`, input)
  ).data
}
export async function deleteProject(id: string) {
  await api.delete(`/projects/${encodeURIComponent(id)}`)
}
