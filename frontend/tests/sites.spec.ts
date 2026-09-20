import { test, expect } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

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

test('project map, draw/create, persisted area, select, edit boundary, remove and delete site', async ({
  page,
  request,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.route('**/src/app/config.ts*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: "export const config = { apiBaseUrl: 'http://127.0.0.1:8000/api', mapboxToken: 'pk.test-placeholder' }",
    }),
  )
  await page.addInitScript(() => {
    window.__mapProbe = {
      mode: 'ready',
      created: 0,
      removed: 0,
      active: 0,
      maximumActive: 0,
      listeners: 0,
      resizes: 0,
      controls: 0,
    }
  })
  for (const [pattern, fixture] of [
    ['**/node_modules/.vite/deps/mapbox-gl.js*', 'mapbox-mock.js'],
    ['**/node_modules/.vite/deps/@mapbox_mapbox-gl-draw.js*', 'draw-mock.js'],
  ]) {
    const body = readFileSync(
      new URL(`./fixtures/${fixture}`, import.meta.url),
      'utf8',
    )
    await page.route(pattern, (route) =>
      route.fulfill({ contentType: 'application/javascript', body }),
    )
  }
  const email = `project-smoke-${randomUUID().replaceAll('-', '')}@example.com`
  const password = randomBytes(24).toString('base64url')
  emails.push(email)
  expect(
    (
      await request.post('http://127.0.0.1:8000/api/auth/register', {
        data: { email, password },
      })
    ).status(),
  ).toBe(201)
  await page.goto('/projects')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await page.getByRole('link', { name: 'Create project', exact: true }).click()
  await page.getByLabel('Project name').fill('Synthetic site workspace')
  await page
    .getByRole('button', { name: 'Create project', exact: true })
    .click()
  await expect(page.getByText('No sites yet.', { exact: false })).toBeVisible()
  await page.getByRole('link', { name: 'Create site', exact: true }).click()
  await page.getByLabel('Site name').fill('Synthetic square')
  await page.getByRole('button', { name: 'Save site', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('draw a polygon')
  await page.getByRole('button', { name: 'Draw synthetic boundary' }).click()
  await page.route('**/api/projects/*/sites', (route) =>
    route.request().method() === 'POST'
      ? route.fulfill({ status: 422, json: { detail: 'Invalid boundary' } })
      : route.continue(),
  )
  await page.getByRole('button', { name: 'Save site', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'boundary or site details are invalid',
  )
  await page.unroute('**/api/projects/*/sites')
  await page.getByRole('button', { name: 'Save site', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Synthetic square', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByText('Geodesic area:', { exact: false }),
  ).toContainText('123.')
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Synthetic square', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Back to project', exact: true }).click()
  await expect(page.getByLabel('Map workspace')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await page.getByLabel('Interactive environmental map').click()
  await expect(page.getByRole('status')).toContainText('Selected:')
  await page
    .getByRole('link', { name: 'Synthetic square', exact: true })
    .first()
    .click()
  await page.getByRole('link', { name: 'Edit site', exact: true }).click()
  await page.getByRole('button', { name: 'Remove synthetic boundary' }).click()
  await expect(page.getByRole('status')).toContainText('No boundary drawn')
  await page.getByRole('button', { name: 'Resize synthetic boundary' }).click()
  await page
    .getByLabel('Interactive environmental map')
    .dispatchEvent('test-map-error')
  await expect(page.getByRole('alert')).toContainText('Map access was denied')
  await page.getByRole('button', { name: 'Retry map' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Map workspace')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await expect(page.getByRole('heading', { name: 'Edit site' })).toBeVisible()
  expect(await page.evaluate(() => window.__mapProbe.restoredWidth)).toBe(0.02)
  await page.getByRole('button', { name: 'Save site', exact: true }).click()
  await expect(
    page.getByText('Geodesic area:', { exact: false }),
  ).toContainText('246.')
  const siteId = new URL(page.url()).pathname.split('/').at(-1)
  if (!siteId) throw new Error('Site navigation did not include an ID')
  execFileSync(
    python,
    ['-m', 'app.db.seed_site_metrics', '--demo', '--site-id', siteId],
    { cwd: backend, stdio: 'pipe' },
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Latest carbon value' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect(
    page.locator('.metric-card').filter({ hasText: 'Latest carbon total' }),
  ).toContainText('26')
  await page
    .getByRole('link', { name: 'Synthetic square', exact: true })
    .click()
  await page.getByRole('button', { name: 'Delete site', exact: true }).click()
  await page.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(page.getByText('No sites yet.', { exact: false })).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => window.__mapProbe.active)).toBe(0)
  expect(await page.evaluate(() => window.__mapProbe.listeners)).toBe(0)
  expect(errors).toEqual([])
})
