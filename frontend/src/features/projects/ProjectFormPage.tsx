import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { ProjectForm } from './ProjectForm'
import { createProject, updateProject } from './api'
import { useProject } from './hooks'
import './projects.css'

export function CreateProjectPage() {
  const navigate = useNavigate()
  return (
    <section>
      <Link className="project-back" to="/projects">
        ← All projects
      </Link>
      <p className="eyebrow">START SOMETHING MEANINGFUL</p>
      <h1>Create project</h1>
      <p className="page-description">
        Give your project a clear name and purpose.
      </p>
      <ProjectForm
        action="Create project"
        cancelTo="/projects"
        onSubmit={async (input) => {
          const project = await createProject(input)
          navigate(`/projects/${project.id}`, {
            replace: true,
            state: { notice: 'Project created.' },
          })
        }}
      />
    </section>
  )
}

export function EditProjectPage() {
  const { projectId = '' } = useParams()
  return <EditProject key={projectId} projectId={projectId} />
}
function EditProject({ projectId }: { projectId: string }) {
  const { data: project, loading, error, reload } = useProject(projectId)
  const navigate = useNavigate()
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
      <Link className="project-back" to={`/projects/${project.id}`}>
        ← Back to project
      </Link>
      <p className="eyebrow">PROJECT DETAILS</p>
      <h1>Edit project</h1>
      <p className="page-description">
        Keep your project information up to date.
      </p>
      <ProjectForm
        initial={project}
        action="Save changes"
        cancelTo={`/projects/${project.id}`}
        onSubmit={async (input) => {
          await updateProject(project.id, input)
          navigate(`/projects/${project.id}`, {
            replace: true,
            state: { notice: 'Project updated.' },
          })
        }}
      />
    </section>
  )
}
