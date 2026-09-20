import { useCallback, useEffect, useState } from 'react'
import { getProject, listProjects } from './api'
import { projectError } from './errors'

function useProjectResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: string }>({})
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data })
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setState({ error: projectError(error) })
      })
    return () => controller.abort()
  }, [load, revision])
  const reload = () => {
    setState({})
    setRevision((value) => value + 1)
  }
  return { ...state, loading: !state.data && !state.error, reload }
}

export function useProjects() {
  return useProjectResource(listProjects)
}
export function useProject(id: string) {
  const load = useCallback(
    (signal: AbortSignal) => getProject(id, signal),
    [id],
  )
  return useProjectResource(load)
}
