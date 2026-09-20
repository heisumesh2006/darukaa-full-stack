import { metricNumber } from './format'

export function MetricCard({
  label,
  value,
  unit,
  note,
}: {
  label: string
  value: number | null
  unit?: string
  note?: string
}) {
  return (
    <article className="metric-card">
      <h3>{label}</h3>
      <p className="metric-value">{metricNumber(value)}</p>
      {unit && <p className="metric-unit">{unit}</p>}
      {note && <p className="metric-note">{note}</p>}
    </article>
  )
}
