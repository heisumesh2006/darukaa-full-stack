// Token-free Draw adapter: exercises application event handling, never real Mapbox drawing.
export default class DrawMock {
  constructor() {
    this.features = []
  }
  onAdd(map) {
    this.map = map
    this.element = document.createElement('div')
    for (const [label, action] of [
      ['Draw synthetic boundary', () => this.draw(0.01)],
      ['Resize synthetic boundary', () => this.draw(0.02)],
      [
        'Remove synthetic boundary',
        () => {
          this.features = []
          this.map.emit('draw.delete')
        },
      ],
    ]) {
      const button = document.createElement('button')
      button.type = 'button'
      button.textContent = label
      button.onclick = action
      this.element.append(button)
    }
    return this.element
  }
  draw(width) {
    this.features = [
      {
        id: 'test-boundary',
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [width, 0],
              [width, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
      },
    ]
    this.map.emit('draw.create')
  }
  add(value) {
    window.__mapProbe.restoredWidth = value.coordinates[0][1][0]
    this.features = [
      { type: 'Feature', id: 'test-boundary', properties: {}, geometry: value },
    ]
    return ['test-boundary']
  }
  getAll() {
    return { type: 'FeatureCollection', features: this.features }
  }
  delete(id) {
    this.features = this.features.filter((feature) => feature.id !== id)
  }
  onRemove() {
    this.element.remove()
  }
}
