import { createBrowserRouter, Link, Navigate, Outlet } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from '../components/PlaceholderPage'
import { ErrorState } from '../components/ErrorState'
import { AuthProvider } from '../features/auth/AuthProvider'
import { AuthPage } from '../features/auth/AuthPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'

export const router = createBrowserRouter([
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    errorElement: (
      <ErrorState
        title="Unable to load this page"
        message="Please reload the application and try again."
      />
    ),
    children: [
      { path: 'login', element: <AuthPage key="login" mode="login" /> },
      {
        path: 'register',
        element: <AuthPage key="register" mode="register" />,
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppShell />,
            children: [
              { index: true, element: <Navigate to="/dashboard" replace /> },
              {
                path: 'dashboard',
                element: (
                  <PlaceholderPage
                    title="Dashboard"
                    module="08"
                    description="Your environmental portfolio, in perspective."
                  />
                ),
              },
              {
                path: 'projects',
                element: (
                  <PlaceholderPage
                    title="Projects"
                    module="04"
                    description="A home for your carbon and biodiversity projects."
                  />
                ),
              },
              {
                path: 'map',
                element: (
                  <PlaceholderPage
                    title="Map"
                    module="05"
                    description="Explore the places behind your environmental projects."
                  />
                ),
              },
              {
                path: '*',
                element: (
                  <section>
                    <p className="eyebrow">404 / PAGE NOT FOUND</p>
                    <h1>This path is unexplored.</h1>
                    <Link to="/">Return to Dashboard</Link>
                  </section>
                ),
              },
            ],
          },
        ],
      },
    ],
  },
])
