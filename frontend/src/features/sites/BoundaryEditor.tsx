import { useEffect, useRef } from 'react'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import type { Polygon } from 'geojson'
import { MapView } from '../map/MapView'
import { polygonBounds } from './geometry'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

export function BoundaryEditor({
  initial,
  onChange,
}: {
  initial?: Polygon
  onChange: (geometry: Polygon | null) => void
}) {
  const change = useRef(onChange)
  const draft = useRef<Polygon | null>(initial ?? null)
  useEffect(() => {
    change.current = onChange
  }, [onChange])
  return (
    <div>
      <p className="page-description">
        Draw one polygon, then click its first point to finish. Select a
        boundary to move it or edit its vertices; use the trash control to
        remove it before saving.
      </p>
      <MapView
        onReady={(map) => {
          const draw = new MapboxDraw({
            displayControlsDefault: false,
            controls: { polygon: true, trash: true },
          })
          map.addControl(draw, 'top-left')
          if (draft.current) {
            draw.add(draft.current)
            const bounds = polygonBounds([draft.current])
            if (bounds)
              map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 })
          }
          const sync = () => {
            const polygons = draw
              .getAll()
              .features.filter((feature) => feature.geometry.type === 'Polygon')
            const latest = polygons.at(-1)
            for (const old of polygons.slice(0, -1))
              if (old.id !== undefined) draw.delete(String(old.id))
            draft.current =
              latest?.geometry.type === 'Polygon' ? latest.geometry : null
            change.current(draft.current)
          }
          map.on('draw.create', sync)
          map.on('draw.update', sync)
          map.on('draw.delete', sync)
          return () => {
            map.off('draw.create', sync)
            map.off('draw.update', sync)
            map.off('draw.delete', sync)
            map.removeControl(draw)
          }
        }}
      />
    </div>
  )
}
