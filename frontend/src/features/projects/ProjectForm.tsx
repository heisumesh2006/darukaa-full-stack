import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { ProjectInput, ProjectStatus } from './types'
import { projectError } from './errors'

export function ProjectForm({
  initial,
  onSubmit,
  cancelTo,
  action,
}: {
  initial?: ProjectInput
  onSubmit: (input: ProjectInput) => Promise<void>
  cancelTo: string
  action: string
}) {
  const [name, setName] = useState(initial?.name || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [status, setStatus] = useState<ProjectStatus>(
    initial?.status || 'draft',
  )
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    if (!name.trim()) {
      setError('Enter a project name.')
      return
    }
    setPending(true)
    setError(null)
    try {
      await onSubmit({
        name: name.trim(),
        description: description.trim() || null,
        status,
      })
    } catch (failure: unknown) {
      setError(projectError(failure))
    } finally {
      setPending(false)
    }
  }
  return (
    <form
      className="project-form surface"
      onSubmit={submit}
      aria-busy={pending}
    >
      <fieldset disabled={pending}>
        <label>
          Project name
          <input
            required
            maxLength={200}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label>
          Description <span className="muted">(optional)</span>
          <textarea
            rows={5}
            maxLength={5000}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>
        <label>
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as ProjectStatus)}
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        {error && (
          <p role="alert" className="project-error">
            {error}
          </p>
        )}
        <div className="project-actions">
          <button className="primary-button" type="submit">
            {pending ? 'Saving…' : action}
          </button>
          {!pending && (
            <Link className="secondary-button" to={cancelTo}>
              Cancel
            </Link>
          )}
        </div>
      </fieldset>
    </form>
  )
}
