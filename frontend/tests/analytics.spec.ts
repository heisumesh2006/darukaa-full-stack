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

test('site analytics empty state, deterministic seed, accessible charts and recoverable error', async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const email = `project-smoke-${randomUUID().replaceAll('-', '')}@example.com`
  const password = randomBytes(24).toString('base64url')
  emails.push(email)
  const account = await request.post(
    'http://127.0.0.1:8000/api/auth/register',
    { data: { email, password } },
  )
  expect(account.status()).toBe(201)
  const headers = {
    Authorization: `Bearer ${(await account.json()).access_token}`,
  }
  const projectResponse = await request.post(
    'http://127.0.0.1:8000/api/projects',
    { headers, data: { name: 'Synthetic analytics project' } },
  )
  const project = await projectResponse.json()
  const siteResponse = await request.post(
    `http://127.0.0.1:8000/api/projects/${project.id}/sites`,
    {
      headers,
      data: {
        name: 'Synthetic analytics site',
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
  await page.goto(`/projects/${project.id}/sites/${site.id}`)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(
    page.getByText('No metric observations yet.', { exact: false }),
  ).toBeVisible()
  execFileSync(
    python,
    ['-m', 'app.db.seed_site_metrics', '--demo', '--site-id', site.id],
    { cwd: backend, stdio: 'pipe' },
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Latest carbon value' }),
  ).toBeVisible()
  await expect(
    page.locator('.metric-card').filter({ hasText: 'Latest carbon value' }),
  ).toContainText('26')
  await expect(
    page.getByText('Synthetic hackathon data only', { exact: false }),
  ).toBeVisible()
  await page
    .getByText('View carbon history data table', { exact: true })
    .click()
  await expect(page.getByRole('table').first()).toContainText('14.75')
  await page.screenshot({
    path: '.verification/site-analytics.png',
    fullPage: true,
  })
  await page.route('**/analytics', (route) =>
    route.fulfill({ status: 503, json: { detail: 'Unavailable' } }),
  )
  await page.reload()
  await expect(page.getByRole('alert')).toContainText(
    'Unable to load environmental analytics',
  )
  await page.unroute('**/analytics')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(
    page.getByRole('heading', { name: 'Latest carbon value' }),
  ).toBeVisible()
  expect(errors).toEqual([])
})
