import { test as base, expect } from '@playwright/test'
import { randomBytes, randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import type { Project } from '../../src/features/projects/types'
import type { Site } from '../../src/features/sites/types'

const backend = fileURLToPath(new URL('../../../backend', import.meta.url))
const python = fileURLToPath(
  new URL(
    process.platform === 'win32'
      ? '../../../backend/.venv/Scripts/python.exe'
      : '../../../backend/.venv/bin/python',
    import.meta.url,
  ),
)
export const api = 'http://127.0.0.1:8000/api'

export const test = base.extend<{
  portfolio: {
    projects: Project[]
    sites: Site[]
    headers: Record<string, string>
  }
}>({
  portfolio: async ({ page, request }, provide) => {
    const email = `project-smoke-${randomUUID().replaceAll('-', '')}@example.com`
    const password = randomBytes(24).toString('base64url')
    try {
      const account = await request.post(`${api}/auth/register`, {
        data: { email, password },
      })
      expect(account.status()).toBe(201)
      const headers = {
        Authorization: `Bearer ${(await account.json()).access_token}`,
      }
      const projects: Project[] = []
      for (const data of [
        {
          name: 'Coastal restoration',
          description: 'Mangrove habitat',
          status: 'active',
        },
        { name: 'Hill forest', description: null, status: 'draft' },
        {
          name: 'Archive ' + 'x'.repeat(170),
          description: 'Coastal history',
          status: 'archived',
        },
      ]) {
        const response = await request.post(`${api}/projects`, {
          headers,
          data,
        })
        expect(response.status()).toBe(201)
        projects.push(await response.json())
      }
      const sites: Site[] = []
      for (const [name, description, width] of [
        ['North wetland', 'Mangrove nursery', 0.005],
        ['South reserve', null, 0.02],
      ] as const) {
        const response = await request.post(
          `${api}/projects/${projects[0].id}/sites`,
          {
            headers,
            data: {
              name,
              description,
              geometry: {
                type: 'Polygon',
                coordinates: [
                  [
                    [0, 0],
                    [width, 0],
                    [width, 0.01],
                    [0, 0.01],
                    [0, 0],
                  ],
                ],
              },
            },
          },
        )
        expect(response.status()).toBe(201)
        sites.push(await response.json())
      }
      await page.goto('/login')
      await page.getByLabel('Email address').fill(email)
      await page.getByLabel('Password', { exact: true }).fill(password)
      await page.getByRole('button', { name: 'Sign in', exact: true }).click()
      await expect(page).toHaveURL(/\/dashboard$/)
      await provide({ projects, sites, headers })
    } finally {
      execFileSync(
        python,
        ['scripts/project_smoke.py', '--cleanup-email', email],
        { cwd: backend, stdio: 'pipe' },
      )
    }
  },
})
export { expect } from '@playwright/test'
