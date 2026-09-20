import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { SiteMap } from './SiteMap'
import { useSites } from './hooks'
import { DiscoveryFilters } from '../../components/DiscoveryFilters'
import {
  matchesText,
  useDiscoveryFilters,
} from '../../hooks/useDiscoveryFilters'
import './sites.css'

export function ProjectSites({ projectId }: { projectId: string }) {
  const { data: sites, loading, error, reload } = useSites(projectId)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const filters = useDiscoveryFilters('siteq', 'area', ['under100', '100plus'])
  const visible = useMemo(
    () =>
      (sites || []).filter(
        (site) =>
          matchesText(site, filters.query) &&
          (filters.filter === 'under100'
            ? site.area_hectares < 100
            : filters.filter === '100plus'
              ? site.area_hectares >= 100
              : true),
      ),
    [sites, filters.query, filters.filter],
  )
  if (loading) return <Loading message="Loading sites…" />
  if (error || !sites)
    return (
      <ErrorState
        title="Sites unavailable"
        message={error || 'Unable to load sites'}
        onRetry={reload}
      />
    )
  const selected = visible.find((site) => site.id === selectedId)
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
      {!!sites.length && (
        <DiscoveryFilters
          noun="Sites"
          label="Site area"
          options={[
            { value: 'under100', label: 'Under 100 ha' },
            { value: '100plus', label: '100 ha or more' },
          ]}
          {...filters}
          count={visible.length}
          total={sites.length}
        />
      )}
      <SiteMap
        sites={visible}
        selectedId={selected?.id}
        onSelect={setSelectedId}
      />
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
      ) : !visible.length ? (
        <div className="surface project-empty">
          <h3>No matching sites</h3>
          <p>Try another name or description, or clear the filters.</p>
        </div>
      ) : (
        <ul className="site-list">
          {visible.map((site) => (
            <li key={site.id}>
              <Link to={`/projects/${projectId}/sites/${site.id}`}>
                {site.name}
              </Link>
              <div className="site-discovery-actions">
                <button
                  type="button"
                  className="secondary-button"
                  aria-label={`Locate ${site.name} on map`}
                  aria-pressed={selected?.id === site.id}
                  onClick={() => setSelectedId(site.id)}
                >
                  Locate on map
                </button>
                <span>
                  {site.area_hectares.toLocaleString(undefined, {
                    maximumFractionDigits: 4,
                  })}{' '}
                  ha
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
