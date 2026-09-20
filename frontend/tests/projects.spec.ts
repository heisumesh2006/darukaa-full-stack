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

test.beforeEach(async ({ page, request }) => {
  const email = `project-smoke-${randomUUID().replaceAll('-', '')}@example.com`
  const password = randomBytes(24).toString('base64url')
  emails.push(email)
  const response = await request.post(
    'http://127.0.0.1:8000/api/auth/register',
    { data: { email, password } },
  )
  expect(response.status()).toBe(201)
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/projects$/)
})

test('empty list, create, persisted detail, edit, cancel deletion and confirmed deletion', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await expect(
    page.getByRole('heading', { name: 'No projects yet' }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Create project', exact: true }).click()
  await page.getByLabel('Project name').fill('  Synthetic restoration  ')
  await page.getByLabel('Description').fill('Synthetic hackathon project')
  await page
    .getByRole('button', { name: 'Create project', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Synthetic restoration', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByText('Synthetic hackathon project', { exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Edit project', exact: true }).click()
  await page.getByLabel('Project name').fill('Updated restoration')
  await page.getByLabel('Status').selectOption('active')
  await page.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'Updated restoration', exact: true }),
  ).toBeVisible()
  await page
    .getByRole('button', { name: 'Delete project', exact: true })
    .click()
  await expect(page.getByRole('dialog')).toContainText('permanently')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await page
    .getByRole('button', { name: 'Delete project', exact: true })
    .click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Delete permanently', exact: true })
    .click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(
    page.getByRole('heading', { name: 'No projects yet' }),
  ).toBeVisible()
  await expect(page.getByRole('status')).toContainText('Project deleted')
  expect(errors).toEqual([])
})

test('project list errors can be retried', async ({ page }) => {
  await page.route('**/api/projects', (route) =>
    route.fulfill({ status: 503, json: { detail: 'Unavailable' } }),
  )
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Unable to load projects' }),
  ).toBeVisible()
  await page.unroute('**/api/projects')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(
    page.getByRole('heading', { name: 'No projects yet' }),
  ).toBeVisible()
})
