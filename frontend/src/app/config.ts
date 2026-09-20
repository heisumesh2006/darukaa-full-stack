export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || '/api',
  mapboxToken: (
    import.meta.env.VITE_MAPBOX_ACCESS_TOKEN ||
    import.meta.env.VITE_MAPBOX_TOKEN ||
    ''
  ).trim(),
}
