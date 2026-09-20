import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { SiteMap } from './SiteMap'
import { useSites } from './hooks'

export function ProjectSites({ projectId }: { projectId: string }) {
  const { data: sites, loading, error, reload } = useSites(projectId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  if (loading) return <Loading message="Loading sites…" />
  if (error || !sites)
    return (
      <ErrorState
        title="Sites unavailable"
        message={error || 'Unable to load sites'}
        onRetry={reload}
      />
    )
  const selected = sites.find((site) => site.id === selectedId)
  return (
    <section className="site-section">
      <div className="project-heading">
        <h2>Project sites</h2>
        <Link
          className="primary-button"
          to={`/projects/${projectId}/sites/new`}
        >
          Create site
        </Link>
      </div>
      <SiteMap sites={sites} onSelect={setSelectedId} />
      {selected && (
        <p role="status">
          Selected:{' '}
          <Link to={`/projects/${projectId}/sites/${selected.id}`}>
            {selected.name}
          </Link>{' '}
          ·{' '}
          {selected.area_hectares.toLocaleString(undefined, {
            maximumFractionDigits: 4,
          })}{' '}
          ha
        </p>
      )}
      {!sites.length ? (
        <p>
          No sites yet. Create a site to define its boundary and calculate its
          area.
        </p>
      ) : (
        <ul className="site-list">
          {sites.map((site) => (
            <li key={site.id}>
              <Link to={`/projects/${projectId}/sites/${site.id}`}>
                {site.name}
              </Link>
              <span>
                {site.area_hectares.toLocaleString(undefined, {
                  maximumFractionDigits: 4,
                })}{' '}
                ha
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
