import { useEffect, useRef, useState } from 'react'
import { deleteProject } from './api'
import { projectError } from './errors'
import type { Project } from './types'

export function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: Project
  onClose: () => void
  onDeleted: () => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  async function confirm() {
    if (pending) return
    setPending(true)
    setError(null)
    try {
      await deleteProject(project.id)
      onDeleted()
    } catch (failure: unknown) {
      setError(projectError(failure))
      setPending(false)
    }
  }
  return (
    <dialog
      className="project-dialog"
      ref={dialog}
      aria-labelledby="delete-title"
      aria-describedby="delete-description"
      onCancel={(event) => {
        if (pending) event.preventDefault()
        else onClose()
      }}
    >
      <p className="eyebrow">PERMANENT ACTION</p>
      <h2 id="delete-title">Delete project?</h2>
      <p id="delete-description">
        “{project.name}” and all its sites and metric records will be
        permanently deleted. This cannot be undone.
      </p>
      {error && (
        <p role="alert" className="project-error">
          {error}
        </p>
      )}
      <div className="project-actions">
        <button
          type="button"
          className="secondary-button"
          onClick={onClose}
          disabled={pending}
        >
          Cancel
        </button>
        <button
          type="button"
          className="danger-button"
          onClick={confirm}
          disabled={pending}
        >
          {pending ? 'Deleting…' : 'Delete permanently'}
        </button>
      </div>
    </dialog>
  )
}
