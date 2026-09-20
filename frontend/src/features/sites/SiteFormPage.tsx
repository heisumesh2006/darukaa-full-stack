import { useState } from 'react'
import type { FormEvent } from 'react'
import type { Polygon } from 'geojson'
import axios from 'axios'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { BoundaryEditor } from './BoundaryEditor'
import { createSite, updateSite } from './api'
import { useSite } from './hooks'
import type { Site } from './types'
import '../projects/projects.css'
import './sites.css'

export function SiteFormPage({ editing = false }: { editing?: boolean }) {
  const { projectId = '', siteId = '' } = useParams()
  return editing ? (
    <EditSite
      key={`${projectId}/${siteId}`}
      projectId={projectId}
      siteId={siteId}
    />
  ) : (
    <SiteForm key={projectId} projectId={projectId} />
  )
}
function EditSite({
  projectId,
  siteId,
}: {
  projectId: string
  siteId: string
}) {
  const { data, loading, error, reload } = useSite(projectId, siteId)
  if (loading) return <Loading message="Loading site…" />
  if (error || !data)
    return (
      <ErrorState
        title="Site unavailable"
        message={error || 'Site not found'}
        onRetry={reload}
      />
    )
  return <SiteForm projectId={projectId} initial={data} />
}
function SiteForm({
  projectId,
  initial,
}: {
  projectId: string
  initial?: Site
}) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [geometry, setGeometry] = useState<Polygon | null>(
    initial?.geometry || null,
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    if (!name.trim() || !geometry) {
      setError('Enter a site name and draw a polygon boundary before saving.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const input = {
        name: name.trim(),
        description: description.trim() || null,
        geometry,
      }
      const site = initial
        ? await updateSite(projectId, initial.id, input)
        : await createSite(projectId, input)
      navigate(`/projects/${projectId}/sites/${site.id}`, { replace: true })
    } catch (failure) {
      setError(
        axios.isAxiosError(failure) && failure.response?.status === 422
          ? 'The boundary or site details are invalid. Use a closed polygon without crossing edges and try again.'
          : 'Unable to save this site. Check your connection and project access, then retry.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <section>
      <Link to={`/projects/${projectId}`}>Back to project</Link>
      <h1>{initial ? 'Edit site' : 'Create site'}</h1>
      <form className="project-form site-form" onSubmit={submit}>
        <fieldset disabled={pending}>
          <label>
            Site name
            <input
              required
              maxLength={200}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              maxLength={5000}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
            />
          </label>
          <BoundaryEditor initial={initial?.geometry} onChange={setGeometry} />
          <p role="status">
            {geometry
              ? 'Boundary ready. Area will be calculated when saved.'
              : 'No boundary drawn yet.'}
          </p>
          {error && (
            <p role="alert" className="project-error">
              {error}
            </p>
          )}
          <div className="project-actions">
            <button className="primary-button" type="submit">
              {pending ? 'Saving…' : 'Save site'}
            </button>
            {!pending && <Link to={`/projects/${projectId}`}>Cancel</Link>}
          </div>
        </fieldset>
      </form>
    </section>
  )
}
