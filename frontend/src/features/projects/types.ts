export type ProjectStatus = 'draft' | 'active' | 'archived'
export interface Project {
  id: string
  owner_id: string
  name: string
  description: string | null
  status: ProjectStatus
  created_at: string
  updated_at: string
}
export interface ProjectInput {
  name: string
  description: string | null
  status: ProjectStatus
}
