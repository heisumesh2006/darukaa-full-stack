import { lazy, Suspense } from 'react'
import { createBrowserRouter, Link, Navigate, Outlet } from 'react-router-dom'
import { Loading } from '../components/Loading'
const SiteFormPage = lazy(() =>
  import('../features/sites/SiteFormPage').then((module) => ({
    default: module.SiteFormPage,
  })),
)
const SiteDetailPage = lazy(() =>
  import('../features/sites/SiteDetailPage').then((module) => ({
    default: module.SiteDetailPage,
  })),
)
import { AppShell } from './AppShell'
import { ErrorState } from '../components/ErrorState'
import { AuthProvider } from '../features/auth/AuthProvider'
import { AuthPage } from '../features/auth/AuthPage'
import { ProtectedRoute } from '../features/auth/ProtectedRoute'
import { ProjectsPage } from '../features/projects/ProjectsPage'
const ProjectDetailPage = lazy(() =>
  import('../features/projects/ProjectDetailPage').then((module) => ({
    default: module.ProjectDetailPage,
  })),
)
import {
  CreateProjectPage,
  EditProjectPage,
} from '../features/projects/ProjectFormPage'

const MapPage = lazy(() =>
  import('../features/map/MapPage').then((module) => ({
    default: module.MapPage,
  })),
)
const DashboardPage = lazy(() =>
  import('../features/dashboard/DashboardPage').then((module) => ({
    default: module.DashboardPage,
  })),
)

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
                  <Suspense fallback={<Loading message="Opening dashboard…" />}>
                    <DashboardPage />
                  </Suspense>
                ),
              },
              {
                path: 'projects',
                element: <ProjectsPage />,
              },
              { path: 'projects/new', element: <CreateProjectPage /> },
              {
                path: 'projects/:projectId/sites/new',
                element: (
                  <Suspense fallback={<Loading message="Opening workspace…" />}>
                    <SiteFormPage />
                  </Suspense>
                ),
              },
              {
                path: 'projects/:projectId/sites/:siteId',
                element: (
                  <Suspense fallback={<Loading message="Opening workspace…" />}>
                    <SiteDetailPage />
                  </Suspense>
                ),
              },
              {
                path: 'projects/:projectId/sites/:siteId/edit',
                element: (
                  <Suspense fallback={<Loading message="Opening workspace…" />}>
                    <SiteFormPage editing />
                  </Suspense>
                ),
              },
              {
                path: 'projects/:projectId',
                element: (
                  <Suspense fallback={<Loading message="Opening workspace…" />}>
                    <ProjectDetailPage />
                  </Suspense>
                ),
              },
              {
                path: 'projects/:projectId/edit',
                element: <EditProjectPage />,
              },
              {
                path: 'map',
                element: (
                  <Suspense
                    fallback={<Loading message="Opening map workspace…" />}
                  >
                    <MapPage />
                  </Suspense>
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
