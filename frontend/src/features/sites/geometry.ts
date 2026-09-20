import type { FeatureCollection, Polygon } from 'geojson'
import type { Site } from './types'

export function siteCollection(sites: Site[]): FeatureCollection<Polygon> {
  return {
    type: 'FeatureCollection',
    features: sites.map((site) => ({
      type: 'Feature',
      id: site.id,
      properties: { id: site.id, name: site.name },
      geometry: site.geometry,
    })),
  }
}
export function polygonBounds(
  polygons: Polygon[],
): [[number, number], [number, number]] | null {
  const positions = polygons.flatMap((polygon) => polygon.coordinates.flat())
  if (!positions.length) return null
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity
  for (const [longitude, latitude] of positions) {
    west = Math.min(west, longitude)
    east = Math.max(east, longitude)
    south = Math.min(south, latitude)
    north = Math.max(north, latitude)
  }
  return [
    [west, south],
    [east, north],
  ]
}
