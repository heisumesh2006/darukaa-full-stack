import { Link } from 'react-router-dom'
import { useResource } from '../../hooks/useResource'
import { Loading } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { MetricCard } from '../analytics/MetricCard'
import { metricNumber } from '../analytics/format'
import { TimeSeriesChart } from '../analytics/TimeSeriesChart'
import { getDashboard } from './api'
import '../analytics/analytics.css'
import '../projects/projects.css'
import './dashboard.css'

export function DashboardPage() {
  const { data, loading, error, reload } = useResource(
    getDashboard,
    'Unable to load your dashboard. Please retry.',
  )
  return (
    <section>
      <div className="project-heading">
        <div>
          <p className="eyebrow">YOUR ENVIRONMENTAL PORTFOLIO</p>
          <h1>Dashboard</h1>
          <p className="page-description">
            Your projects, places, and observations in one view.
          </p>
        </div>
        <Link className="primary-button" to="/projects/new">
          Create project
        </Link>
      </div>
      {loading && <Loading message="Loading dashboard…" />}
      {error && <ErrorState message={error} onRetry={reload} />}
      {data && (
        <>
          <div className="metric-grid dashboard-totals">
            <MetricCard label="Total projects" value={data.total_projects} />
            <MetricCard label="Total sites" value={data.total_sites} />
            <MetricCard
              label="Total site area"
              value={data.total_area_hectares}
              unit="hectares · summed site areas"
            />
          </div>
          {!data.total_projects && (
            <div className="surface project-empty">
              <h2>Start your environmental portfolio</h2>
              <p>
                Create a project, define its site boundaries, and explore the
                observations as they become available.
              </p>
              <Link className="secondary-button" to="/projects/new">
                Create your first project
              </Link>
            </div>
          )}
          <p className="data-policy">{data.data_policy}</p>
          <div className="metric-grid">
            <MetricCard
              label="Latest carbon total"
              value={data.latest_carbon_total}
              unit={data.carbon_unit}
              note={`Latest available value per site · ${data.carbon_sites} of ${data.total_sites} sites with observations`}
            />
            <MetricCard
              label="Latest biodiversity average"
              value={data.latest_biodiversity_average}
              unit={data.biodiversity_unit}
              note={`Equal weight per site · ${data.biodiversity_sites} of ${data.total_sites} sites with observations`}
            />
          </div>
          <p className="dashboard-asof">
            {data.latest_observation_at
              ? `Latest observation: ${new Date(data.latest_observation_at).toISOString().slice(0, 10)} (UTC). Sites may have different observation dates.`
              : 'No environmental observations available yet.'}
          </p>
          <div className="dashboard-overviews">
            <section className="surface dashboard-panel">
              <div className="dashboard-panel-heading">
                <h2>Project overview</h2>
                <Link to="/projects">All projects</Link>
              </div>
              {data.projects.length ? (
                <ul>
                  {data.projects.map((project) => (
                    <li key={project.id}>
                      <div>
                        <Link to={`/projects/${project.id}`}>
                          {project.name}
                        </Link>
                        <p>
                          {project.site_count} sites ·{' '}
                          {metricNumber(project.area_hectares)} ha
                        </p>
                      </div>
                      <span className={`project-status ${project.status}`}>
                        {project.status}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No projects yet.</p>
              )}
              <p className="dashboard-caption">
                Up to six recently updated projects.
              </p>
            </section>
            <section className="surface dashboard-panel">
              <div className="dashboard-panel-heading">
                <h2>Site overview</h2>
                <Link to="/map">Map explorer</Link>
              </div>
              {data.sites.length ? (
                <ul>
                  {data.sites.map((site) => (
                    <li key={site.id}>
                      <div>
                        <Link
                          to={`/projects/${site.project_id}/sites/${site.id}`}
                        >
                          {site.name}
                        </Link>
                        <p>{site.project_name}</p>
                        <Link
                          className="site-insight-link"
                          to={`/projects/${site.project_id}/sites/${site.id}`}
                        >
                          View boundary & analytics
                        </Link>
                      </div>
                      <span>{metricNumber(site.area_hectares)} ha</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No sites yet. Open a project to draw its first boundary.</p>
              )}
              <p className="dashboard-caption">
                Up to eight recently updated sites.
              </p>
            </section>
          </div>
          <section className="analytics-section">
            <h2>Observation trends</h2>
            <p className="page-description">
              Monthly averages of recorded observations across your sites. These
              are not cumulative portfolio totals.
            </p>
            {!data.monthly_observations.length ? (
              <div className="surface project-empty">
                <h3>No observation history yet</h3>
                <p>
                  Site analytics will appear here when metric records are
                  available.
                </p>
              </div>
            ) : (
              <div className="chart-grid">
                <TimeSeriesChart
                  title="Monthly carbon observations"
                  unit={data.carbon_unit}
                  points={data.monthly_observations.map((row) => ({
                    recorded_at: row.recorded_at,
                    value: row.carbon_average,
                  }))}
                />
                <TimeSeriesChart
                  title="Monthly biodiversity observations"
                  unit={data.biodiversity_unit}
                  points={data.monthly_observations.map((row) => ({
                    recorded_at: row.recorded_at,
                    value: row.biodiversity_average,
                  }))}
                />
              </div>
            )}
          </section>
        </>
      )}
    </section>
  )
}
