import { useSearchParams } from 'react-router-dom'

export function useDiscoveryFilters(
  searchKey: string,
  filterKey: string,
  allowed: string[],
) {
  const [params, setParams] = useSearchParams()
  const query = params.get(searchKey) || ''
  const raw = params.get(filterKey) || ''
  const filter = allowed.includes(raw) ? raw : ''
  function update(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )
  }
  return {
    query,
    filter,
    setQuery: (value: string) => update(searchKey, value),
    setFilter: (value: string) => update(filterKey, value),
    clear: () =>
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete(searchKey)
          next.delete(filterKey)
          return next
        },
        { replace: true },
      ),
  }
}

export function matchesText(
  item: { name: string; description: string | null },
  query: string,
) {
  const needle = query.trim().toLowerCase()
  return [item.name, item.description || ''].some((value) =>
    value.toLowerCase().includes(needle),
  )
}
