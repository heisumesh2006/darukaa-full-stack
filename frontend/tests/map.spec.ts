import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { readFileSync } from 'node:fs'

declare global {
  interface Window {
    __mapProbe: {
      mode: string
      created: number
      removed: number
      active: number
      maximumActive: number
      listeners: number
      resizes: number
      controls: number
      center?: number[]
      zoom?: number
      style?: string
      receivedPublicPlaceholder?: boolean
      restoredWidth?: number
      extensions?: number
      extensionCleanups?: number
    }
  }
}

const backend = fileURLToPath(new URL('../../backend', import.meta.url))
const python = fileURLToPath(
  new URL(
    process.platform === 'win32'
      ? '../../backend/.venv/Scripts/python.exe'
      : '../../backend/.venv/bin/python',
    import.meta.url,
  ),
)
const mockModule = readFileSync(
  new URL('./fixtures/mapbox-mock.js', import.meta.url),
  'utf8',
)
const emails: string[] = []

test.afterEach(() => {
  for (const email of emails.splice(0))
    execFileSync(python, ['scripts/auth_smoke.py', '--cleanup-email', email], {
      cwd: backend,
      stdio: 'pipe',
    })
})

async function authenticate(page: Page) {
  const email = `auth-smoke-${randomUUID().replaceAll('-', '')}@example.com`
  const password = randomBytes(24).toString('base64url')
  emails.push(email)
  const response = await page.request.post(
    'http://127.0.0.1:8000/api/auth/register',
    { data: { email, password } },
  )
  expect(response.status()).toBe(201)
  await page.goto('/map')
  await expect(page).toHaveURL(/\/login$/)
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(page).toHaveURL(/\/map$/)
  await expect(
    page.getByRole('heading', { name: 'Map', exact: true }),
  ).toBeVisible()
}

async function mapEnvironment(page: Page, token = '', mode = 'ready') {
  await page.route('**/src/app/config.ts*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: `export const config = { apiBaseUrl: 'http://127.0.0.1:8000/api', mapboxToken: ${JSON.stringify(token)} }`,
    }),
  )
  await page.addInitScript((mode) => {
    window.__mapProbe = {
      mode,
      created: 0,
      removed: 0,
      active: 0,
      maximumActive: 0,
      listeners: 0,
      resizes: 0,
      controls: 0,
    }
  }, mode)
  await page.route('**/node_modules/.vite/deps/mapbox-gl.js*', (route) =>
    route.fulfill({ contentType: 'application/javascript', body: mockModule }),
  )
}

test('protected map handles missing token, responsive layout and logout without page errors', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mapEnvironment(page)
  await authenticate(page)
  await expect(page.getByLabel('Map workspace')).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'Set up your map workspace' }),
  ).toBeVisible()
  await expect(
    page.getByText('VITE_MAPBOX_ACCESS_TOKEN', { exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => window.__mapProbe.created)).toBe(0)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.getByLabel('Map workspace')).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: '.verification/map-missing-token-mobile.png',
    fullPage: true,
  })
  await page.getByRole('button', { name: 'Sign out', exact: true }).click()
  await page.goto('/map')
  await expect(page).toHaveURL(/\/login$/)
  expect(errors).toEqual([])
})

test('configured map mounts once, supplies configuration and controls, resizes and cleans up', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await mapEnvironment(page, 'pk.test-placeholder')
  await authenticate(page)
  await expect(
    page.getByRole('button', { name: 'Zoom in', exact: true }),
  ).toBeVisible()
  await expect(page.getByLabel('Map workspace')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  const probe = await page.evaluate(() => window.__mapProbe)
  expect(probe.created).toBe(1)
  expect(probe.active).toBe(1)
  expect(probe.maximumActive).toBe(1)
  expect(probe.receivedPublicPlaceholder).toBe(true)
  expect(probe.center).toEqual([78.96, 22.59])
  expect(probe.zoom).toBe(4)
  expect(probe.style).toBe('mapbox://styles/mapbox/light-v11')
  await page.setViewportSize({ width: 900, height: 700 })
  await expect
    .poll(() => page.evaluate(() => window.__mapProbe.resizes))
    .toBeGreaterThan(probe.resizes)
  await page.getByRole('link', { name: 'Projects', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__mapProbe.active)).toBe(0)
  expect(await page.evaluate(() => window.__mapProbe.listeners)).toBe(0)
  const resizes = await page.evaluate(() => window.__mapProbe.resizes)
  await page.setViewportSize({ width: 1100, height: 800 })
  expect(await page.evaluate(() => window.__mapProbe.resizes)).toBe(resizes)
  await page.getByRole('link', { name: 'Map explorer', exact: true }).click()
  await expect(
    page.getByRole('button', { name: 'Zoom in', exact: true }),
  ).toBeVisible()
  expect(await page.evaluate(() => window.__mapProbe.maximumActive)).toBe(1)
  expect(errors).toEqual([])
})

test('denied map access shows a safe error and retry releases the previous instance', async ({
  page,
}) => {
  await mapEnvironment(page, 'pk.test-placeholder', 'denied')
  await authenticate(page)
  await expect(page.getByRole('alert')).toContainText('Map access was denied')
  await page.evaluate(() => {
    window.__mapProbe.mode = 'ready'
  })
  await page.getByRole('button', { name: 'Retry map' }).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByLabel('Map workspace')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  expect(
    await page.evaluate(() => ({
      created: window.__mapProbe.created,
      removed: window.__mapProbe.removed,
      active: window.__mapProbe.active,
    })),
  ).toEqual({ created: 2, removed: 1, active: 1 })
})

for (const [mode, message] of [
  ['throw', 'could not initialize'],
  ['unsupported', 'Enable WebGL'],
]) {
  test(`map ${mode} failure stays inside the map workspace`, async ({
    page,
  }) => {
    await mapEnvironment(page, 'pk.test-placeholder', mode)
    await authenticate(page)
    await expect(page.getByRole('alert')).toContainText(message)
    await expect(
      page.getByRole('link', { name: 'Projects', exact: true }),
    ).toBeVisible()
  })
}

test('invalid public-token format does not initialize Mapbox', async ({
  page,
}) => {
  await mapEnvironment(page, 'invalid-placeholder')
  await authenticate(page)
  await expect(
    page.getByRole('heading', { name: 'Map configuration needs attention' }),
  ).toBeVisible()
  expect(await page.evaluate(() => window.__mapProbe.created)).toBe(0)
})

test('actual Vite configuration uses public environment variables only', async ({
  page,
}) => {
  await page.goto('/login')
  const configuration = await page.evaluate(async () => {
    const path = '/src/app/config.ts'
    const { config } = await import(path)
    const source = await (await fetch(path)).text()
    return {
      keys: Object.keys(config).sort(),
      hasTokenVariable: source.includes('VITE_MAPBOX_ACCESS_TOKEN'),
      hasPrivateVariables:
        /JWT_SECRET_KEY|POSTGRES_PASSWORD|VITE_\w*(?:JWT|SECRET|PASSWORD)/.test(
          source,
        ),
    }
  })
  expect(configuration).toEqual({
    keys: ['apiBaseUrl', 'mapboxToken'],
    hasTokenVariable: true,
    hasPrivateVariables: false,
  })
})

test('reusable map preserves its instance on rerender and releases feature extensions on unmount', async ({
  page,
}) => {
  await mapEnvironment(page, 'pk.test-placeholder')
  await authenticate(page)
  await page.getByRole('link', { name: 'Dashboard', exact: true }).click()
  await expect.poll(() => page.evaluate(() => window.__mapProbe.active)).toBe(0)
  await page.evaluate(async () => {
    const reactPath = '/node_modules/.vite/deps/react.js'
    const domPath = '/node_modules/.vite/deps/react-dom_client.js'
    const mapPath = '/src/features/map/MapView.tsx'
    // Vite's optimized CommonJS React modules expose their API via default.
    const { createElement, StrictMode } = (await import(reactPath)).default
    const { createRoot } = (await import(domPath)).default
    const { MapView } = await import(mapPath)
    const element = document.createElement('div')
    document.body.append(element)
    const root = createRoot(element)
    window.__mapProbe.extensions = 0
    window.__mapProbe.extensionCleanups = 0
    const render = () =>
      root.render(
        createElement(
          StrictMode,
          null,
          createElement(MapView, {
            initialCenter: [77, 20],
            initialZoom: 5,
            styleUrl: 'mapbox://styles/mapbox/streets-v12',
            onReady: () => {
              window.__mapProbe.extensions! += 1
              return () => {
                window.__mapProbe.extensionCleanups! += 1
              }
            },
          }),
        ),
      )
    window.addEventListener('test-map-rerender', render)
    window.addEventListener(
      'test-map-unmount',
      () => {
        root.unmount()
        element.remove()
        window.removeEventListener('test-map-rerender', render)
      },
      { once: true },
    )
    render()
  })
  await expect
    .poll(() => page.evaluate(() => window.__mapProbe.extensions))
    .toBe(1)
  const initial = await page.evaluate(() => window.__mapProbe)
  expect(initial.center).toEqual([77, 20])
  expect(initial.zoom).toBe(5)
  expect(initial.style).toBe('mapbox://styles/mapbox/streets-v12')
  await page.evaluate(() =>
    window.dispatchEvent(new Event('test-map-rerender')),
  )
  await expect(page.getByLabel('Map workspace')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  expect(await page.evaluate(() => window.__mapProbe.created)).toBe(
    initial.created,
  )
  await page.evaluate(() => window.dispatchEvent(new Event('test-map-unmount')))
  expect(
    await page.evaluate(() => ({
      active: window.__mapProbe.active,
      listeners: window.__mapProbe.listeners,
      cleanups: window.__mapProbe.extensionCleanups,
    })),
  ).toEqual({ active: 0, listeners: 0, cleanups: 1 })
})
