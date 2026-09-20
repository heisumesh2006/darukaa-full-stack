import { useMemo } from 'react'
import Highcharts from 'highcharts'
import HighchartsReact from 'highcharts-react-official'
import 'highcharts/modules/accessibility'

export interface SeriesPoint {
  recorded_at: string
  value: number | null
}
export function TimeSeriesChart({
  title,
  unit,
  points,
}: {
  title: string
  unit: string
  points: SeriesPoint[]
}) {
  const options = useMemo<Highcharts.Options>(
    () => ({
      chart: {
        type: 'line',
        height: 300,
        animation: false,
        backgroundColor: 'transparent',
        style: { fontFamily: 'inherit' },
      },
      title: { text: title, style: { fontSize: '16px' } },
      xAxis: { type: 'datetime', title: { text: 'Observation date (UTC)' } },
      yAxis: { title: { text: unit } },
      legend: { enabled: false },
      credits: { enabled: false },
      accessibility: {
        enabled: true,
        description: `${title}. Missing observations are gaps; a data table is available below.`,
      },
      plotOptions: { series: { animation: false, connectNulls: false } },
      series: [
        {
          type: 'line',
          name: unit,
          color: '#377d50',
          data: points.map((point) => [
            Date.parse(point.recorded_at),
            point.value,
          ]),
        },
      ],
    }),
    [title, unit, points],
  )
  return (
    <div className="chart-panel">
      <HighchartsReact highcharts={Highcharts} options={options} />
      <details>
        <summary>View {title.toLowerCase()} data table</summary>
        <div className="table-scroll">
          <table>
            <caption>
              {title} — {unit}
            </caption>
            <thead>
              <tr>
                <th scope="col">Date (UTC)</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.recorded_at}>
                  <td>
                    {new Date(point.recorded_at).toISOString().slice(0, 10)}
                  </td>
                  <td>
                    {point.value === null
                      ? 'No data'
                      : point.value.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  )
}
