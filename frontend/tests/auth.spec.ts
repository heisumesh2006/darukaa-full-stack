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
    execFileSync(python, ['scripts/auth_smoke.py', '--cleanup-email', email], {
      cwd: backend,
      stdio: 'pipe',
    })
})

test('registration, refresh, logout, login and protected navigation', async ({
  page,
}) => {
  await page.clock.install()
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  const email = `auth-smoke-${randomUUID().replaceAll('-', '')}@example.com`
  const password = randomBytes(24).toString('base64url')
  emails.push(email)
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login$/)
  await expect(
    page.getByRole('heading', { name: 'Welcome back' }),
  ).toBeVisible()
  await page.screenshot({
    path: '.verification/auth-login.png',
    fullPage: true,
  })
  await page
    .getByRole('link', { name: 'Create an account', exact: true })
    .click()
  await expect(page).toHaveURL(/\/register$/)
  await page.getByLabel('Full name').fill('Authentication smoke test')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click()
  await expect(page).toHaveURL(/\/dashboard$/)
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  await page.reload()
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toBeVisible()
  // Exercise the real shared interceptor with a local adapter; no external request is sent.
  const headerScopes = await page.evaluate(async () => {
    const modulePath = '/src/services/api.ts'
    const { api } = await import(modulePath)
    const results: boolean[] = []
    for (const url of [
      '/auth/me',
      '/auth/login',
      'https://unrelated.example/probe',
      'http://localhost:8000/api-other/probe',
    ]) {
      const response = await api.get(url, {
        adapter: async (config: {
          headers: { has: (name: string) => boolean }
        }) => ({
          data: config.headers.has('Authorization'),
          status: 200,
          statusText: 'OK',
          headers: {},
          config,
        }),
      })
      results.push(response.data)
    }
    return results
  })
  expect(headerScopes).toEqual([true, false, false, false])
  await page
    .getByRole('navigation', { name: 'Main navigation' })
    .getByRole('link', { name: 'Map explorer', exact: true })
    .click()
  await expect(
    page.getByRole('heading', { name: 'Map', exact: true }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await expect(page).toHaveURL(/\/login$/)
  expect(
    await page.evaluate(() => sessionStorage.getItem('darukaa.accessToken')),
  ).toBeNull()
  await page.goto('/projects')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email address').fill(email)
  await page
    .getByLabel('Password', { exact: true })
    .fill(randomBytes(24).toString('base64url'))
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'email or password is incorrect',
  )
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/projects$/)
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible()
  await page.clock.fastForward(31 * 60 * 1000)
  await expect(page).toHaveURL(/\/login$/)
  expect(
    await page.evaluate(() => sessionStorage.getItem('darukaa.accessToken')),
  ).toBeNull()
  await page.goto('/register')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page
    .getByRole('button', { name: 'Create account', exact: true })
    .click()
  await expect(page.getByRole('alert')).toContainText('already registered')
  expect(errors).toEqual([])
})

test('malformed stored token is cleared and protected content stays hidden', async ({
  page,
}) => {
  await page.goto('/login')
  await page.evaluate(() =>
    sessionStorage.setItem('darukaa.accessToken', 'invalid-token'),
  )
  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/login$/)
  expect(
    await page.evaluate(() => sessionStorage.getItem('darukaa.accessToken')),
  ).toBeNull()
  await expect(
    page.getByRole('heading', { name: 'Dashboard', exact: true }),
  ).toHaveCount(0)
})

test('backend unavailable displays a recoverable message', async ({ page }) => {
  await page.route('**/api/auth/login', (route) =>
    route.abort('connectionfailed'),
  )
  await page.goto('/login')
  await page.getByLabel('Email address').fill('auth-smoke-network@example.com')
  await page
    .getByLabel('Password', { exact: true })
    .fill(randomBytes(24).toString('base64url'))
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText(
    'Unable to reach the server',
  )
  await expect(
    page.getByRole('button', { name: 'Sign in', exact: true }),
  ).toBeEnabled()
})
