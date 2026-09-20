import { test, expect, api } from './fixtures/portfolio'

test('project loading, failure/retry and literal filters never masquerade as an empty portfolio', async ({
  page,
  portfolio,
}) => {
  expect(portfolio.projects).toHaveLength(3)
  let release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/projects', async (route) => {
    await gate
    await route.fulfill({ status: 503, json: { detail: 'Unavailable' } })
  })
  try {
    await page.goto('/projects?q=coastal&status=active')
    await expect(page.getByRole('status')).toContainText(
      'Loading your projects',
    )
    await expect(
      page.getByRole('heading', { name: 'No projects yet' }),
    ).toHaveCount(0)
  } finally {
    release()
  }
  await expect(page.getByRole('alert')).toContainText('Unable to load projects')
  await page.unroute('**/api/projects')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByLabel('Project status')).toHaveValue('active')
  await expect(page.locator('.project-card')).toHaveCount(1)
  await page.getByLabel('Search projects').fill('%')
  await page.getByLabel('Search projects').press('Enter')
  await expect(
    page.getByRole('heading', { name: 'No matching projects' }),
  ).toBeVisible()
  await page.goto('/projects?status=unsupported')
  await expect(page.getByLabel('Project status')).toHaveValue('')
  await expect(page.locator('.project-card')).toHaveCount(3)
})

test('site errors recover with filters intact and project switching clears stale results', async ({
  page,
  portfolio,
}) => {
  const id = portfolio.projects[0].id
  await page.route(`**/api/projects/${id}/sites`, (route) =>
    route.fulfill({ status: 503, json: { detail: 'Unavailable' } }),
  )
  await page.goto(`/map?project=${id}&siteq=North&area=under100`)
  await expect(page.getByRole('alert')).toContainText('Sites unavailable')
  await expect(
    page.getByRole('heading', { name: 'No matching sites' }),
  ).toHaveCount(0)
  await page.unroute(`**/api/projects/${id}/sites`)
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.getByLabel('Search sites')).toHaveValue('North')
  await expect(page.locator('.site-list li')).toHaveCount(1)
  await page
    .getByLabel('Explore project')
    .selectOption(portfolio.projects[1].id)
  await expect(
    page.getByText('No sites yet. Create a site', { exact: false }),
  ).toBeVisible()
  await expect(page.locator('.site-list li')).toHaveCount(0)
  await expect(page).not.toHaveURL(/siteq=/)
  await page.goBack()
  await expect(page.getByLabel('Search sites')).toHaveValue('North')
  await expect(page.locator('.site-list li')).toHaveCount(1)
  await page.goto('/map?project=00000000-0000-0000-0000-000000000001')
  await expect(page.getByRole('alert')).toContainText(
    'This project is unavailable',
  )
  await expect(page.locator('.site-list li')).toHaveCount(0)
})

test('an API 401 clears the session and hides protected portfolio data', async ({
  page,
  portfolio,
}) => {
  await page.goto('/projects')
  await expect(
    page.getByRole('link', { name: portfolio.projects[0].name, exact: true }),
  ).toBeVisible()
  await page.route('**/api/dashboard/summary', (route) =>
    route.fulfill({
      status: 401,
      json: { detail: 'Invalid or expired access token' },
    }),
  )
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Dashboard', exact: true })
    .click()
  await expect(page).toHaveURL(/\/login$/)
  expect(
    await page.evaluate(() => sessionStorage.getItem('darukaa.accessToken')),
  ).toBeNull()
  await expect(page.getByRole('heading', { name: 'Total sites' })).toHaveCount(
    0,
  )
  await page.goto(`/projects/${portfolio.projects[0].id}`)
  await expect(page).toHaveURL(/\/login$/)
})

test('failed project deletion keeps data and dialog available for an explicit retry', async ({
  page,
  request,
  portfolio,
}) => {
  const project = portfolio.projects[0]
  await page.goto(`/projects/${project.id}`)
  await page.route(`**/api/projects/${project.id}`, (route) =>
    route.request().method() === 'DELETE'
      ? route.fulfill({ status: 503, json: { detail: 'Unavailable' } })
      : route.continue(),
  )
  await page
    .getByRole('button', { name: 'Delete project', exact: true })
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(dialog.getByRole('alert')).toBeVisible()
  expect(
    (
      await request.get(`${api}/projects/${project.id}`, {
        headers: portfolio.headers,
      })
    ).status(),
  ).toBe(200)
  await page.unroute(`**/api/projects/${project.id}`)
  await dialog.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(page.locator('.project-card')).toHaveCount(2)
  expect(
    (
      await request.get(`${api}/projects/${project.id}`, {
        headers: portfolio.headers,
      })
    ).status(),
  ).toBe(404)
  const summary = await request.get(`${api}/dashboard/summary`, {
    headers: portfolio.headers,
  })
  expect((await summary.json()).total_sites).toBe(0)
})
