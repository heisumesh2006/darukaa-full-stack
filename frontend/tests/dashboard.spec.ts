import { test, expect } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const backend = fileURLToPath(new URL('../../backend', import.meta.url))
const python = fileURLToPath(
  new URL(
    process.platform === 'win32'
      ? '../../backend/.venv/Scripts/python.exe'
      : '../../backend/.venv/bin/python',
    import.meta.url,
  ),
)
const emails: string[] = []
test.afterEach(() => {
  for (const email of emails.splice(0))
    execFileSync(
      python,
      ['scripts/project_smoke.py', '--cleanup-email', email],
      { cwd: backend, stdio: 'pipe' },
    )
})

test('dashboard empty state, persisted KPIs, charts, navigation, retry and logout', async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const email = `project-smoke-${randomUUID().replaceAll('-', '')}@example.com`
  const password = randomBytes(24).toString('base64url')
  emails.push(email)
  await page.goto('/register')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Start your environmental portfolio' }),
  ).toBeVisible()
  await expect(
    page.locator('.metric-card').filter({ hasText: 'Latest carbon total' }),
  ).toContainText('No data')
  const login = await request.post('http://127.0.0.1:8000/api/auth/login', {
    data: { email, password },
  })
  expect(login.status()).toBe(200)
  const headers = {
    Authorization: `Bearer ${(await login.json()).access_token}`,
  }
  const projectResponse = await request.post(
    'http://127.0.0.1:8000/api/projects',
    { headers, data: { name: 'Synthetic dashboard project' } },
  )
  const project = await projectResponse.json()
  const siteResponse = await request.post(
    `http://127.0.0.1:8000/api/projects/${project.id}/sites`,
    {
      headers,
      data: {
        name: 'Synthetic dashboard site',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [0, 0],
              [0.01, 0],
              [0.01, 0.01],
              [0, 0.01],
              [0, 0],
            ],
          ],
        },
      },
    },
  )
  expect(siteResponse.status()).toBe(201)
  const site = await siteResponse.json()
  execFileSync(
    python,
    ['-m', 'app.db.seed_site_metrics', '--demo', '--site-id', site.id],
    { cwd: backend, stdio: 'pipe' },
  )
  await page.reload()
  await expect(
    page.locator('.metric-card').filter({ hasText: 'Total projects' }),
  ).toContainText('1')
  await expect(
    page.locator('.metric-card').filter({ hasText: 'Total site area' }),
  ).toContainText('123.09')
  await expect(
    page.locator('.metric-card').filter({ hasText: 'Latest carbon total' }),
  ).toContainText('26')
  await page
    .getByText('View monthly carbon observations data table', { exact: true })
    .click()
  await expect(page.getByRole('table').first()).toContainText('2025-06-01')
  await page.screenshot({
    path: '.verification/dashboard-desktop.png',
    fullPage: true,
  })
  await page.setViewportSize({ width: 390, height: 844 })
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('.highcharts-container')].every(
          (chart) =>
            chart.getBoundingClientRect().width <=
            (chart.closest('.chart-panel')?.clientWidth || 0),
        ),
      ),
    )
    .toBe(true)
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: '.verification/dashboard-mobile.png',
    fullPage: true,
  })
  await page
    .getByRole('link', { name: 'Synthetic dashboard site', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Environmental analytics', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Back to project', exact: true }).click()
  await expect(
    page.getByRole('heading', {
      name: 'Synthetic dashboard project',
      exact: true,
    }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Map explorer', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Map', exact: true }),
  ).toBeVisible()
  await page.route('**/dashboard/summary', (route) =>
    route.fulfill({ status: 503, json: { detail: 'Unavailable' } }),
  )
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Unable to load your dashboard',
  )
  await page.unroute('**/dashboard/summary')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(
    page.getByRole('heading', { name: 'Total projects' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(errors).toEqual([])
})
