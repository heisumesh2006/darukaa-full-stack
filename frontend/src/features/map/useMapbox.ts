import { useEffect, useRef, useState } from 'react'
import type { RefObject } from 'react'
import type { ErrorEvent, Map } from 'mapbox-gl'
import type { MapReadyHandler, MapState, MapViewOptions } from './types'
import {
  DEFAULT_MAP_CENTER,
  DEFAULT_MAP_STYLE,
  DEFAULT_MAP_ZOOM,
} from './defaults'

export function useMapbox(
  container: RefObject<HTMLDivElement | null>,
  accessToken: string,
  options: MapViewOptions,
  onReady?: MapReadyHandler,
) {
  const [state, setState] = useState<MapState>({ phase: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const readyHandler = useRef(onReady)
  useEffect(() => {
    readyHandler.current = onReady
  }, [onReady])
  const [longitude, latitude] = options.initialCenter ?? DEFAULT_MAP_CENTER
  const zoom = options.initialZoom ?? DEFAULT_MAP_ZOOM
  const style = options.styleUrl ?? DEFAULT_MAP_STYLE

  useEffect(() => {
    let disposed = false
    let map: Map | undefined
    let observer: ResizeObserver | undefined
    let extensionCleanup: void | (() => void)
    let timer: ReturnType<typeof setTimeout> | undefined
    let loaded = false

    const fail = (message: string) => {
      if (!disposed) {
        clearTimeout(timer)
        setState({ phase: 'error', message })
      }
    }
    const onError = (event: ErrorEvent) => {
      const status = (event.error as Error & { status?: number }).status
      fail(
        status === 401 || status === 403
          ? 'Map access was denied. Check the public token and its allowed website URLs.'
          : 'The map could not load. Check your connection and map configuration, then retry.',
      )
      // Do not log the raw event: provider errors can include token-bearing URLs.
    }
    const onLoad = () => {
      if (disposed || loaded || !map) return
      loaded = true
      clearTimeout(timer)
      try {
        extensionCleanup = readyHandler.current?.(map)
        setState({ phase: 'ready' })
      } catch {
        fail('The map workspace could not initialize. Please retry.')
      }
    }
    async function initialize() {
      try {
        // Only load the large Mapbox bundle on an authenticated, configured map.
        const { default: mapboxgl } = await import('mapbox-gl')
        if (disposed) return
        setState({ phase: 'loading' })
        if (!container.current) {
          fail('The map container is unavailable. Please reopen this page.')
          return
        }
        if (!mapboxgl.supported()) {
          fail(
            'This browser cannot display the map. Enable WebGL or try another browser.',
          )
          return
        }
        map = new mapboxgl.Map({
          container: container.current,
          accessToken,
          style,
          center: [longitude, latitude],
          zoom,
          attributionControl: true,
        })
        map.on('error', onError)
        map.on('load', onLoad)
        map.addControl(new mapboxgl.NavigationControl(), 'top-right')
        observer = new ResizeObserver(() => {
          if (!disposed) map?.resize()
        })
        observer.observe(container.current)
        timer = setTimeout(
          () =>
            fail(
              'The map is taking too long to load. Check your connection and retry.',
            ),
          25000,
        )
      } catch {
        fail(
          'The map could not initialize. Check browser support and map configuration, then retry.',
        )
      }
    }
    void initialize()
    return () => {
      disposed = true
      clearTimeout(timer)
      observer?.disconnect()
      map?.off('load', onLoad)
      map?.off('error', onError)
      try {
        extensionCleanup?.()
      } finally {
        map?.remove()
      }
    }
  }, [container, accessToken, longitude, latitude, zoom, style, attempt])

  return { state, retry: () => setAttempt((value) => value + 1) }
}
