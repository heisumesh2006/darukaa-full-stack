// Browser-test stand-in only. No network requests, actual map data or credentials.
const probe = window.__mapProbe

class TestMap {
  constructor(options) {
    if (probe.mode === 'throw')
      throw new Error('Synthetic initialization failure')
    this.container = options.container
    this.handlers = new globalThis.Map()
    this.sources = new globalThis.Map()
    this.layers = new globalThis.Map()
    this.click = () => this.emit('click', { point: { x: 1, y: 1 } })
    this.container.addEventListener('click', this.click)
    this.simulateError = () => this.emit('error', { error: { status: 401 } })
    this.container.addEventListener('test-map-error', this.simulateError)
    this.removed = false
    probe.created += 1
    probe.active += 1
    probe.maximumActive = Math.max(probe.maximumActive, probe.active)
    probe.center = options.center
    probe.zoom = options.zoom
    probe.style = options.style
    probe.receivedPublicPlaceholder =
      options.accessToken === 'pk.test-placeholder'
    this.timer = setTimeout(() => {
      if (probe.mode === 'timeout') return
      if (probe.mode === 'denied')
        this.emit('error', { error: { status: 401 } })
      else this.emit('load')
    }, 20)
  }
  on(type, handler) {
    this.handlers.set(type, handler)
    probe.listeners += 1
    return this
  }
  off(type, handler) {
    if (this.handlers.get(type) === handler) {
      this.handlers.delete(type)
      probe.listeners -= 1
    }
    return this
  }
  emit(type, event = {}) {
    this.handlers.get(type)?.(event)
  }
  addControl(instance) {
    if (instance.onAdd) {
      this.container.append(instance.onAdd(this))
      return this
    }
    const control = document.createElement('button')
    control.type = 'button'
    control.setAttribute('aria-label', 'Zoom in')
    control.textContent = '+'
    control.dataset.testControl = 'true'
    this.container.append(control)
    probe.controls += 1
    return this
  }
  resize() {
    if (this.removed) throw new Error('Resized removed map')
    probe.resizes += 1
    return this
  }
  removeControl(instance) {
    instance.onRemove?.(this)
    return this
  }
  addSource(id, source) {
    this.sources.set(id, source)
    return this
  }
  getSource(id) {
    return this.sources.get(id)
  }
  removeSource(id) {
    this.sources.delete(id)
    return this
  }
  addLayer(layer) {
    this.layers.set(layer.id, layer)
    return this
  }
  getLayer(id) {
    return this.layers.get(id)
  }
  removeLayer(id) {
    this.layers.delete(id)
    return this
  }
  getStyle() {
    return this.removed ? undefined : { version: 8 }
  }
  fitBounds() {
    return this
  }
  queryRenderedFeatures() {
    return this.sources.get('project-sites')?.data.features || []
  }
  remove() {
    if (this.removed) throw new Error('Map removed twice')
    this.removed = true
    clearTimeout(this.timer)
    this.container.removeEventListener('click', this.click)
    this.container.removeEventListener('test-map-error', this.simulateError)
    this.container.replaceChildren()
    probe.removed += 1
    probe.active -= 1
  }
}

export default {
  supported: () => probe.mode !== 'unsupported',
  Map: TestMap,
  NavigationControl: class {},
}
