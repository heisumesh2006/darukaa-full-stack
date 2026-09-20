export interface MetricRecord {
  id: string
  site_id: string
  recorded_at: string
  carbon_value: number | null
  biodiversity_value: number | null
}
export interface MetricSummary {
  observations: number
  latest: number | null
  latest_at: string | null
  minimum: number | null
  maximum: number | null
  average: number | null
  change: number | null
  percentage_change: number | null
  trend: 'increasing' | 'decreasing' | 'stable' | 'insufficient_data'
}
export interface SiteAnalyticsData {
  site_id: string
  data_policy: string
  carbon_unit: string
  biodiversity_unit: string
  carbon: MetricSummary
  biodiversity: MetricSummary
  series: MetricRecord[]
}
