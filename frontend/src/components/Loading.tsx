export function Loading({ message = 'Loading…' }: { message?: string }) {
  return (
    <div role="status" className="feedback">
      <span className="spinner" aria-hidden="true" />
      {message}
    </div>
  )
}
