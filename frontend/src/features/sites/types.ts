import type { Polygon } from 'geojson'

export interface Site {
  id: string
  project_id: string
  name: string
  description: string | null
  geometry: Polygon
  area_hectares: number
  created_at: string
  updated_at: string
}
export interface SiteInput {
  name: string
  description: string | null
  geometry: Polygon
}
