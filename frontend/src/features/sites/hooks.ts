import { useCallback } from 'react'
import { useResource } from '../../hooks/useResource'
import { getSite, listSites } from './api'

export function useSites(projectId: string) {
  return useResource(
    useCallback(
      (signal: AbortSignal) => listSites(projectId, signal),
      [projectId],
    ),
    'Unable to load sites. The project may be unavailable, or the server could not be reached.',
  )
}
export function useSite(projectId: string, siteId: string) {
  return useResource(
    useCallback(
      (signal: AbortSignal) => getSite(projectId, siteId, signal),
      [projectId, siteId],
    ),
    'This site is unavailable or could not be loaded.',
  )
}
