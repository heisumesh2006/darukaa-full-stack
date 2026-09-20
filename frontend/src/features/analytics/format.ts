export function metricNumber(value: number | null, digits = 2) {
  return value === null
    ? 'No data'
    : value.toLocaleString(undefined, { maximumFractionDigits: digits })
}
