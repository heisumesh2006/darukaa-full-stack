export default {
  'frontend/**/*.{ts,tsx}': [
    'eslint --config frontend/eslint.config.js --fix --max-warnings 0',
    'prettier --write',
  ],
  '*.{json,md,yml,yaml,css,html,mjs}': 'prettier --write',
  'backend/**/*.py': [
    'node scripts/ruff.mjs check --fix',
    'node scripts/ruff.mjs format',
  ],
}
