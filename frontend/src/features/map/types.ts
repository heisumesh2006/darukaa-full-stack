import type { Map } from 'mapbox-gl'

export interface MapViewOptions {
  initialCenter?: [longitude: number, latitude: number]
  initialZoom?: number
  styleUrl?: string
}

// Called after the style loads. A future feature may add GeoJSON sources/layers
// and listeners here, returning a cleanup function called before map.remove().
export type MapReadyHandler = (map: Map) => void | (() => void)

export type MapState =
  { phase: 'loading' | 'ready' } | { phase: 'error'; message: string }
