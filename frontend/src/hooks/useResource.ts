import { useEffect, useState } from 'react'

export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  message: string,
) {
  const [state, setState] = useState<{ data?: T; error?: string }>({})
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setState({ data })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ error: message })
      })
    return () => controller.abort()
  }, [load, message, revision])
  return {
    ...state,
    loading: !state.data && !state.error,
    reload: () => {
      setState({})
      setRevision((value) => value + 1)
    },
  }
}
