import { NavLink, Outlet } from 'react-router-dom'

export function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <aside className="sidebar">
        <LinkBrand />
        <p className="workspace-label">ENVIRONMENTAL INTELLIGENCE</p>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/projects">Projects</NavLink>
          <NavLink to="/map">Map explorer</NavLink>
        </nav>
        <div className="sidebar-note">
          <span className="status-dot" /> Foundation preview
          <p>Built for a clearer view of our planet.</p>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span>Workspace / Darukaa.Earth</span>
          <span className="badge">Module 01</span>
        </header>
        <main id="main">
          <Outlet />
        </main>
        <footer>
          Darukaa.Earth <span>Carbon & biodiversity intelligence</span>
        </footer>
      </div>
    </div>
  )
}

function LinkBrand() {
  return (
    <NavLink className="brand" to="/" aria-label="Darukaa Earth home">
      <span className="brand-mark" aria-hidden="true">
        D
      </span>
      darukaa<span className="brand-earth">.earth</span>
    </NavLink>
  )
}
