import { createBrowserRouter, Link } from 'react-router-dom'
import { AppShell } from './AppShell'
import { PlaceholderPage } from '../components/PlaceholderPage'
import { ErrorState } from '../components/ErrorState'

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: (
      <ErrorState
        title="Unable to load this page"
        message="Please reload the application and try again."
      />
    ),
    children: [
      {
        index: true,
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
])
