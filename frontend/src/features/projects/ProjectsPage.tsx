import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { Loading } from '../../components/Loading'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import { useProjects } from './hooks'
import type { Project } from './types'
import './projects.css'

export function ProjectsPage() {
  const { data: projects, error, loading, reload } = useProjects()
  const [selected, setSelected] = useState<Project | null>(null)
  const location = useLocation()
  const [notice, setNotice] = useState<string | null>(
    location.state?.notice || null,
  )
  return (
    <section>
      <div className="project-heading">
        <div>
          <p className="eyebrow">YOUR ENVIRONMENTAL PORTFOLIO</p>
          <h1>Projects</h1>
          <p className="page-description">
            Organize your environmental work, one project at a time.
          </p>
        </div>
        <Link className="primary-button" to="/projects/new">
          Create project
        </Link>
      </div>
      {notice && (
        <p role="status" className="project-notice">
          {notice}
        </p>
      )}
      {loading && <Loading message="Loading your projects…" />}
      {error && (
        <ErrorState
          title="Unable to load projects"
          message={error}
          onRetry={reload}
        />
      )}
      {projects?.length === 0 && (
        <div className="surface project-empty">
          <span className="badge">YOUR NEXT CHAPTER</span>
          <h2>No projects yet</h2>
          <p>
            Create your first project to start organizing your environmental
            work.
          </p>
          <Link className="secondary-button" to="/projects/new">
            Create your first project
          </Link>
        </div>
      )}
      {projects && projects.length > 0 && (
        <div className="project-grid">
          {projects.map((project) => (
            <article className="surface project-card" key={project.id}>
              <span className={`project-status ${project.status}`}>
                {project.status}
              </span>
              <h2>
                <Link to={`/projects/${project.id}`}>{project.name}</Link>
              </h2>
              <p className="project-summary">
                {project.description || 'No description added yet.'}
              </p>
              <p className="project-date">
                Updated {new Date(project.updated_at).toLocaleDateString()}
              </p>
              <div className="project-card-actions">
                <Link to={`/projects/${project.id}`}>View project</Link>
                <Link
                  to={`/projects/${project.id}/edit`}
                  aria-label={`Edit ${project.name}`}
                >
                  Edit
                </Link>
                <button
                  className="text-danger"
                  aria-label={`Delete ${project.name}`}
                  onClick={() => setSelected(project)}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
      {selected && (
        <DeleteProjectDialog
          project={selected}
          onClose={() => setSelected(null)}
          onDeleted={() => {
            setSelected(null)
            setNotice('Project deleted.')
            reload()
          }}
        />
      )}
    </section>
  )
}
