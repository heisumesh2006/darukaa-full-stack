import { MapView } from './MapView'

export function MapPage() {
  return (
    <section>
      <p className="eyebrow">SPATIAL WORKSPACE</p>
      <h1>Map</h1>
      <p className="page-description">
        Explore the landscape behind your environmental projects.
      </p>
      <div className="map-toolbar">
        <span>Map explorer</span>
        <span>India · Initial view</span>
      </div>
      <MapView />
      <div className="map-foundation-note">
        <h2>Your spatial workspace starts here</h2>
        <p>
          Explore using pan and zoom. Project site boundaries and selection will
          be available in a future update.
        </p>
      </div>
    </section>
  )
}
