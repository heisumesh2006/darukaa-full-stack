import { useCallback } from 'react'
import { useResource } from '../../hooks/useResource'
import { ErrorState } from '../../components/ErrorState'
import { Loading } from '../../components/Loading'
import { getSiteAnalytics } from './api'
import { MetricCard } from './MetricCard'
import { metricNumber } from './format'
import { TimeSeriesChart } from './TimeSeriesChart'
import type { MetricSummary } from './types'
import './analytics.css'

function summaryNote(summary: MetricSummary) {
  if (!summary.observations) return 'No observations available'
  return `${summary.observations} observations · Average ${metricNumber(summary.average)} · Range ${metricNumber(summary.minimum)}–${metricNumber(summary.maximum)} · Change ${metricNumber(summary.change)} · ${summary.trend.replaceAll('_', ' ')}`
}
export function SiteAnalytics({
  projectId,
  siteId,
}: {
  projectId: string
  siteId: string
}) {
  const load = useCallback(
    (signal: AbortSignal) => getSiteAnalytics(projectId, siteId, signal),
    [projectId, siteId],
  )
  const { data, loading, error, reload } = useResource(
    load,
    'Unable to load environmental analytics. Please retry.',
  )
  return (
    <section
      className="analytics-section"
      aria-labelledby="site-analytics-title"
    >
      <h2 id="site-analytics-title">Environmental analytics</h2>
      {loading && <Loading message="Loading analytics…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <p className="data-policy">{data.data_policy}</p>
          {!data.series.length ? (
            <p>
              No metric observations yet. Site area remains available above.
            </p>
          ) : (
            <>
              <div className="metric-grid">
                <MetricCard
                  label="Latest carbon value"
                  value={data.carbon.latest}
                  unit={data.carbon_unit}
                  note={summaryNote(data.carbon)}
                />
                <MetricCard
                  label="Latest biodiversity score"
                  value={data.biodiversity.latest}
                  unit={data.biodiversity_unit}
                  note={summaryNote(data.biodiversity)}
                />
              </div>
              <div className="chart-grid">
                <TimeSeriesChart
                  title="Carbon history"
                  unit={data.carbon_unit}
                  points={data.series.map((row) => ({
                    recorded_at: row.recorded_at,
                    value: row.carbon_value,
                  }))}
                />
                <TimeSeriesChart
                  title="Biodiversity history"
                  unit={data.biodiversity_unit}
                  points={data.series.map((row) => ({
                    recorded_at: row.recorded_at,
                    value: row.biodiversity_value,
                  }))}
                />
              </div>
            </>
          )}
        </>
      )}
    </section>
  )
}
