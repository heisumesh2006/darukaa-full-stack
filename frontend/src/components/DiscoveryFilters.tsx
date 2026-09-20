import './discovery.css'

export function DiscoveryFilters({
  noun,
  label,
  options,
  query,
  filter,
  setQuery,
  setFilter,
  clear,
  count,
  total,
}: {
  noun: string
  label: string
  options: { value: string; label: string }[]
  query: string
  filter: string
  setQuery: (value: string) => void
  setFilter: (value: string) => void
  clear: () => void
  count: number
  total: number
}) {
  return (
    <section className="discovery" aria-label={`${noun} search and filters`}>
      <div className="discovery-controls">
        <label>
          Search {noun.toLowerCase()}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Name or description"
          />
        </label>
        <label>
          {label}
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="">All {noun.toLowerCase()}</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="secondary-button"
          onClick={clear}
          disabled={!query && !filter}
        >
          Clear filters
        </button>
      </div>
      <p role="status" aria-live="polite">
        {count} of {total} {noun.toLowerCase()}
      </p>
    </section>
  )
}
