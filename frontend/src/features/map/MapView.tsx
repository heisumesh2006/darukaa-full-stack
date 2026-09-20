import { useRef } from 'react'
import { config } from '../../app/config'
import { useMapbox } from './useMapbox'
import type { MapReadyHandler, MapViewOptions } from './types'
import 'mapbox-gl/dist/mapbox-gl.css'
import './map.css'

export interface MapViewProps extends MapViewOptions {
  onReady?: MapReadyHandler
}

export function MapView(props: MapViewProps) {
  const token = config.mapboxToken
  if (!token || !token.startsWith('pk.')) {
    return (
      <div className="map-frame" aria-label="Map workspace">
        <div className="map-fallback" role="status">
          <span className="map-symbol" aria-hidden="true">
            ◎
          </span>
          <h2>
            {token
              ? 'Map configuration needs attention'
              : 'Set up your map workspace'}
          </h2>
          <p>
            {token
              ? 'Use a public Mapbox browser token. Secret server tokens are not supported.'
              : 'Add a public Mapbox token to enable the interactive map.'}
          </p>
          <p className="map-setup-note">
            Set <code>VITE_MAPBOX_ACCESS_TOKEN</code> in your local environment,
            then restart the frontend.
          </p>
        </div>
      </div>
    )
  }
  return <ConfiguredMap {...props} accessToken={token} />
}

function ConfiguredMap({
  accessToken,
  onReady,
  ...options
}: MapViewProps & { accessToken: string }) {
  const container = useRef<HTMLDivElement>(null)
  const { state, retry } = useMapbox(container, accessToken, options, onReady)
  return (
    <div
      className="map-frame"
      aria-label="Map workspace"
      aria-busy={state.phase === 'loading'}
    >
      <div
        className="map-canvas"
        ref={container}
        aria-label="Interactive environmental map"
      />
      {state.phase === 'loading' && (
        <div className="map-overlay" role="status">
          <span className="map-loading-dot" aria-hidden="true" />
          <p>Loading map…</p>
        </div>
      )}
      {state.phase === 'error' && (
        <div className="map-overlay" role="alert">
          <h2>Map unavailable</h2>
          <p>{state.message}</p>
          <button className="map-retry" type="button" onClick={retry}>
            Retry map
          </button>
        </div>
      )}
    </div>
  )
}
