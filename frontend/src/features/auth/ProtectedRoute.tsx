import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { Loading } from '../../components/Loading'
import { ErrorState } from '../../components/ErrorState'
import { useAuth } from './useAuth'

export function ProtectedRoute() {
  const auth = useAuth()
  const location = useLocation()
  if (auth.isLoading) return <Loading message="Restoring your session…" />
  if (auth.sessionError)
    return (
      <div>
        <ErrorState
          title="Unable to restore your session"
          message={auth.sessionError}
          onRetry={auth.retrySession}
        />
        <button type="button" className="session-signout" onClick={auth.logout}>
          Sign out
        </button>
      </div>
    )
  if (!auth.isAuthenticated)
    return <Navigate to="/login" state={{ from: location.pathname }} replace />
  return <Outlet />
}
