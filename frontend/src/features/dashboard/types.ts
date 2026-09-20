export interface DashboardData {
  total_projects: number
  total_sites: number
  total_area_hectares: number
  latest_carbon_total: number | null
  carbon_sites: number
  latest_biodiversity_average: number | null
  biodiversity_sites: number
  latest_observation_at: string | null
  data_policy: string
  carbon_unit: string
  biodiversity_unit: string
  projects: {
    id: string
    name: string
    status: string
    site_count: number
    area_hectares: number
  }[]
  sites: {
    id: string
    project_id: string
    project_name: string
    name: string
    area_hectares: number
  }[]
  monthly_observations: {
    recorded_at: string
    observations: number
    carbon_average: number | null
    biodiversity_average: number | null
  }[]
}
