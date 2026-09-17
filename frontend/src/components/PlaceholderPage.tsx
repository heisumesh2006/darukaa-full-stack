export function PlaceholderPage({
  title,
  description,
  module,
}: {
  title: string
  description: string
  module: string
}) {
  return (
    <section>
      <p className="eyebrow">A CONNECTED VIEW OF NATURE</p>
      <h1>{title}</h1>
      <p className="page-description">{description}</p>
      <div className="placeholder">
        <div className="orb" aria-hidden="true">
          <span />
        </div>
        <span className="badge">PLANNED · MODULE {module}</span>
        <h2>A foundation for meaningful impact.</h2>
        <p>
          This workspace is taking shape. {title} functionality will be
          implemented and validated in Module {module}.
        </p>
        <div className="placeholder-foot">
          <span className="status-dot" /> Application foundation ready
        </div>
      </div>
    </section>
  )
}
