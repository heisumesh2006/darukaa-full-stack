import { MapView } from './MapView'
import { Link, useSearchParams } from 'react-router-dom'
import { useProjects } from '../projects/hooks'
import { ProjectSites } from '../sites/ProjectSites'
import { Loading } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import '../projects/projects.css'

export function MapPage() {
  const { data: projects, loading, error, reload } = useProjects()
  const [params, setParams] = useSearchParams()
  const projectId = params.get('project') || ''
  const selected = projects?.find((project) => project.id === projectId)
  return (
    <section>
      <p className="eyebrow">SPATIAL WORKSPACE</p>
      <h1>Map</h1>
      <p className="page-description">
        Choose a project to discover its sites, locate boundaries, and open site
        analytics.
      </p>
      {loading && <Loading message="Loading map projects…" />}
      {error && (
        <ErrorState
          title="Projects unavailable"
          message={error}
          onRetry={reload}
        />
      )}
      {projects && (
        <div className="discovery discovery-controls">
          <label>
            Explore project
            <select
              value={selected?.id || ''}
              onChange={(event) => {
                const next = new URLSearchParams()
                if (event.target.value) next.set('project', event.target.value)
                setParams(next)
              }}
            >
              <option value="">Choose a project</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          </label>
          <Link to="/projects">Browse all projects</Link>
        </div>
      )}
      {projects && projectId && !selected && (
        <p role="alert">
          This project is unavailable. Choose one of your projects.
        </p>
      )}
      {selected ? (
        <>
          <Link to={`/projects/${selected.id}`}>Open project details</Link>
          <ProjectSites key={selected.id} projectId={selected.id} />
        </>
      ) : (
        <>
          <div className="map-toolbar">
            <span>Map explorer</span>
            <span>India · Initial view</span>
          </div>
          <MapView />
          {projects?.length === 0 && (
            <div className="map-foundation-note">
              <h2>No projects to explore yet</h2>
              <Link to="/projects/new">Create your first project</Link>
            </div>
          )}
        </>
      )}
    </section>
  )
}
