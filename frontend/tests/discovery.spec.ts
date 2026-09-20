import { readFileSync } from 'node:fs'
import { test, expect } from './fixtures/portfolio'

test('project text/status filters combine, survive reload/back, and handle no results on mobile', async ({
  page,
  portfolio,
}) => {
  await page.goto('/projects')
  const filters = page.getByRole('region', {
    name: 'Projects search and filters',
  })
  await expect(filters.getByRole('status')).toHaveText('3 of 3 projects')
  await page.getByLabel('Search projects').fill('  COASTAL  ')
  await expect(filters.getByRole('status')).toHaveText('2 of 3 projects')
  await page.getByLabel('Project status').selectOption('active')
  await expect(filters.getByRole('status')).toHaveText('1 of 3 projects')
  await page.reload()
  await expect(page.getByLabel('Project status')).toHaveValue('active')
  await page
    .getByRole('link', { name: 'Coastal restoration', exact: true })
    .click()
  await page.goBack()
  await expect(page.getByLabel('Search projects')).toHaveValue('  COASTAL  ')
  await page.getByLabel('Search projects').fill('not present')
  await expect(
    page.getByRole('heading', { name: 'No matching projects' }),
  ).toBeVisible()
  await expect(
    page.getByRole('heading', { name: 'No projects yet', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await expect(filters.getByRole('status')).toHaveText('3 of 3 projects')
  await page.getByLabel('Search projects').fill('Mangrove')
  await expect(filters.getByRole('status')).toHaveText('1 of 3 projects')
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.setViewportSize({ width: 320, height: 740 })
  await expect(
    page.getByRole('link', { name: portfolio.projects[2].name, exact: true }),
  ).toBeVisible()
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: '.verification/discovery-projects-mobile.png',
    fullPage: true,
  })
})

test('site text/area filters drive map discovery and analytics navigation', async ({
  page,
  portfolio,
}) => {
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
  await page.route('**/node_modules/.vite/deps/mapbox-gl.js*', (route) =>
    route.fulfill({
      contentType: 'application/javascript',
      body: readFileSync(
        new URL('./fixtures/mapbox-mock.js', import.meta.url),
        'utf8',
      ),
    }),
  )
  await page.goto(`/map?project=${portfolio.projects[0].id}`)
  const filters = page.getByRole('region', { name: 'Sites search and filters' })
  await expect(filters.getByRole('status')).toHaveText('2 of 2 sites')
  await page.getByLabel('Search sites').fill('  MANGROVE  ')
  await expect(filters.getByRole('status')).toHaveText('1 of 2 sites')
  await page.getByLabel('Site area').selectOption('100plus')
  await expect(
    page.getByRole('heading', { name: 'No matching sites' }),
  ).toBeVisible()
  await page.getByLabel('Site area').selectOption('under100')
  await expect(filters.getByRole('status')).toHaveText('1 of 2 sites')
  await page.reload()
  await expect(page.getByLabel('Site area')).toHaveValue('under100')
  await expect(page.getByLabel('Map workspace')).toHaveAttribute(
    'aria-busy',
    'false',
  )
  await page
    .getByRole('button', { name: 'Locate North wetland on map' })
    .click()
  await expect(
    page.getByRole('button', { name: 'Locate North wetland on map' }),
  ).toHaveAttribute('aria-pressed', 'true')
  await expect(
    page.getByRole('status').filter({ hasText: 'Selected:' }),
  ).toContainText('North wetland')
  await page.getByLabel('Search sites').fill('South')
  await expect(
    page.getByRole('status').filter({ hasText: 'Selected:' }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByLabel('Site area').selectOption('100plus')
  await page.getByLabel('Interactive environmental map').click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Selected:' }),
  ).toContainText('South reserve')
  await page.setViewportSize({ width: 320, height: 740 })
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true)
  await page.screenshot({
    path: '.verification/discovery-map-mobile.png',
    fullPage: true,
  })
  await page
    .locator('.site-list')
    .getByRole('link', { name: 'South reserve' })
    .click()
  await page.getByRole('link', { name: 'Jump to analytics' }).click()
  await expect(
    page.getByRole('heading', { name: 'Environmental analytics', exact: true }),
  ).toBeVisible()
  await page.getByRole('link', { name: 'Portfolio overview' }).click()
  await expect(page.getByRole('heading', { name: 'Total sites' })).toBeVisible()
  expect(await page.evaluate(() => window.__mapProbe.active)).toBe(0)
  expect(await page.evaluate(() => window.__mapProbe.listeners)).toBe(0)
})
