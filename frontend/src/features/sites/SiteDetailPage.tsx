import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorState } from '../../components/ErrorState'
import { Loading } from '../../components/Loading'
import { useSite } from './hooks'
import { deleteSite } from './api'
import { SiteMap } from './SiteMap'
import type { Site } from './types'
import '../projects/projects.css'
import './sites.css'
const SiteAnalytics = lazy(() =>
  import('../analytics/SiteAnalytics').then((module) => ({
    default: module.SiteAnalytics,
  })),
)

export function SiteDetailPage() {
  const { projectId = '', siteId = '' } = useParams()
  return (
    <SiteDetail
      key={`${projectId}/${siteId}`}
      projectId={projectId}
      siteId={siteId}
    />
  )
}
function SiteDetail({
  projectId,
  siteId,
}: {
  projectId: string
  siteId: string
}) {
  const { data: site, loading, error, reload } = useSite(projectId, siteId)
  const [deleting, setDeleting] = useState(false)
  if (loading) return <Loading message="Loading site…" />
  if (error || !site)
    return (
      <ErrorState
        title="Site unavailable"
        message={error || 'Site not found'}
        onRetry={reload}
      />
    )
  return (
    <section>
      <div className="page-links">
        <Link to={`/projects/${projectId}`}>Back to project</Link>
        <Link to={`/map?project=${projectId}`}>Explore project sites</Link>
        <a href="#site-analytics">Jump to analytics</a>
        <Link to="/dashboard">Portfolio overview</Link>
      </div>
      <div className="project-heading">
        <h1>{site.name}</h1>
        <div className="project-actions">
          <Link
            to={`/projects/${projectId}/sites/${siteId}/edit`}
            className="secondary-button"
          >
            Edit site
          </Link>
          <button
            type="button"
            className="danger-button"
            onClick={() => setDeleting(true)}
          >
            Delete site
          </button>
        </div>
      </div>
      <p className="project-description">
        {site.description || 'No description added.'}
      </p>
      <p className="site-area">
        Geodesic area:{' '}
        <strong>
          {site.area_hectares.toLocaleString(undefined, {
            maximumFractionDigits: 6,
          })}{' '}
          ha
        </strong>
      </p>
      <SiteMap sites={[site]} />
      <div id="site-analytics" tabIndex={-1}>
        <Suspense fallback={<Loading message="Opening analytics…" />}>
          <SiteAnalytics projectId={projectId} siteId={siteId} />
        </Suspense>
      </div>
      {deleting && (
        <DeleteSiteDialog site={site} onClose={() => setDeleting(false)} />
      )}
    </section>
  )
}
function DeleteSiteDialog({
  site,
  onClose,
}: {
  site: Site
  onClose: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(false)
  const navigate = useNavigate()
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  async function confirm() {
    if (pending) return
    setPending(true)
    setError(false)
    try {
      await deleteSite(site.project_id, site.id)
      navigate(`/projects/${site.project_id}`, { replace: true })
    } catch {
      setError(true)
      setPending(false)
    }
  }
  return (
    <dialog
      className="project-dialog"
      ref={dialog}
      aria-labelledby="delete-site-title"
      onCancel={(event) => {
        if (pending) event.preventDefault()
        else onClose()
      }}
    >
      <h2 id="delete-site-title">Delete site?</h2>
      <p>{site.name} and all its metric records will be permanently deleted.</p>
      {error && <p role="alert">Unable to delete site. Please retry.</p>}
      <div className="project-actions">
        <button type="button" disabled={pending} onClick={onClose}>
          Cancel
        </button>
        <button
          type="button"
          disabled={pending}
          className="danger-button"
          onClick={confirm}
        >
          {pending ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </dialog>
  )
}
