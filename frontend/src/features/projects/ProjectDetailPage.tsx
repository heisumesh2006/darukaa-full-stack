import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useProject } from './hooks'
import { DeleteProjectDialog } from './DeleteProjectDialog'
import './projects.css'
import { ProjectSites } from '../sites/ProjectSites'
import '../sites/sites.css'

export function ProjectDetailPage() {
  const { projectId = '' } = useParams()
  return <ProjectDetail key={projectId} projectId={projectId} />
}
function ProjectDetail({ projectId }: { projectId: string }) {
  const { data: project, loading, error, reload } = useProject(projectId)
  const [deleting, setDeleting] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  if (loading) return <Loading message="Loading project…" />
  if (error || !project)
    return (
      <section>
        <Link to="/projects">Back to projects</Link>
        <ErrorState
          title="Project unavailable"
          message={error || 'Project not found.'}
          onRetry={reload}
        />
      </section>
    )
  return (
    <section>
      <Link className="project-back" to="/projects">
        ← All projects
      </Link>
      <div className="project-heading">
        <div>
          <p className="eyebrow">PROJECT WORKSPACE</p>
          <h1>{project.name}</h1>
        </div>
        <div className="project-actions">
          <Link className="secondary-button" to={`/map?project=${project.id}`}>
            Explore project sites
          </Link>
          <Link
            className="secondary-button"
            to={`/projects/${project.id}/edit`}
          >
            Edit project
          </Link>
          <button
            type="button"
            className="danger-button"
            onClick={() => setDeleting(true)}
          >
            Delete project
          </button>
        </div>
      </div>
      {location.state?.notice && (
        <p role="status" className="project-notice">
          {location.state.notice}
        </p>
      )}
      <div className="surface project-overview">
        <span className={`project-status ${project.status}`}>
          {project.status}
        </span>
        <h2>About this project</h2>
        <p className="project-description">
          {project.description ||
            'Add a description to explain this project’s purpose.'}
        </p>
        <dl className="project-metadata">
          <div>
            <dt>Created</dt>
            <dd>{new Date(project.created_at).toLocaleString()}</dd>
          </div>
          <div>
            <dt>Last updated</dt>
            <dd>{new Date(project.updated_at).toLocaleString()}</dd>
          </div>
        </dl>
      </div>
      <ProjectSites projectId={project.id} />
      {deleting && (
        <DeleteProjectDialog
          project={project}
          onClose={() => setDeleting(false)}
          onDeleted={() =>
            navigate('/projects', {
              replace: true,
              state: { notice: 'Project deleted.' },
            })
          }
        />
      )}
    </section>
  )
}
