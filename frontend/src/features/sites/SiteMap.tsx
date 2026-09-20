import { useCallback, useEffect, useState } from 'react'
import type { Map, MapMouseEvent } from 'mapbox-gl'
import { MapView } from '../map/MapView'
import { polygonBounds, siteCollection } from './geometry'
import type { Site } from './types'

export function SiteMap({
  sites,
  onSelect,
  selectedId,
}: {
  sites: Site[]
  onSelect?: (id: string) => void
  selectedId?: string
}) {
  const [map, setMap] = useState<Map | null>(null)
  const ready = useCallback((instance: Map) => {
    setMap(instance)
    return () => setMap(null)
  }, [])
  useEffect(() => {
    if (!map) return
    map.addSource('project-sites', {
      type: 'geojson',
      data: siteCollection(sites),
    })
    map.addLayer({
      id: 'project-sites-fill',
      type: 'fill',
      source: 'project-sites',
      paint: { 'fill-color': '#518b55', 'fill-opacity': 0.35 },
    })
    map.addLayer({
      id: 'project-sites-outline',
      type: 'line',
      source: 'project-sites',
      paint: { 'line-color': '#234f34', 'line-width': 2 },
    })
    const select = (event: MapMouseEvent) => {
      const feature = map.queryRenderedFeatures(event.point, {
        layers: ['project-sites-fill'],
      })[0]
      if (typeof feature?.properties?.id === 'string')
        onSelect?.(feature.properties.id)
    }
    map.on('click', select)
    const bounds = polygonBounds(sites.map((site) => site.geometry))
    if (bounds) map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 })
    return () => {
      map.off('click', select)
      if (map.getStyle()) {
        for (const layer of ['project-sites-outline', 'project-sites-fill'])
          if (map.getLayer(layer)) map.removeLayer(layer)
        if (map.getSource('project-sites')) map.removeSource('project-sites')
      }
    }
  }, [map, sites, onSelect])
  useEffect(() => {
    const site = sites.find((item) => item.id === selectedId)
    if (!map || !site) return
    const bounds = polygonBounds([site.geometry])
    if (bounds) map.fitBounds(bounds, { padding: 50, maxZoom: 14, duration: 0 })
  }, [map, sites, selectedId])
  return <MapView onReady={ready} />
}
