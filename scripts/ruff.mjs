import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const executable = fileURLToPath(
  new URL(
    process.platform === 'win32'
      ? '../backend/.venv/Scripts/ruff.exe'
      : '../backend/.venv/bin/ruff',
    import.meta.url,
  ),
)
const result = spawnSync(executable, process.argv.slice(2), {
  stdio: 'inherit',
})
if (result.error)
  console.error(
    'Create backend/.venv and install backend dev dependencies first.',
    result.error.message,
  )
process.exit(result.status ?? 1)
