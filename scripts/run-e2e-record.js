#!/usr/bin/env node

const { spawnSync } = require('child_process')

const extraArgs = process.argv.slice(2)

if (extraArgs.length === 0) {
  console.error('[E2E] Recording requires an explicit target. Example:')
  console.error('  pnpm test:e2e:record -- tests/e2e/test/image-image2image-generate.spec.ts')
  process.exit(1)
}

const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
const result = spawnSync(pnpmCommand, ['exec', 'playwright', 'test', ...extraArgs], {
  stdio: 'inherit',
  env: {
    ...process.env,
    E2E_VCR_MODE: 'record'
  },
  shell: process.platform === 'win32'
})

if (result.error) {
  throw result.error
}

process.exit(result.status ?? 0)
