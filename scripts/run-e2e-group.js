#!/usr/bin/env node

const { spawnSync } = require('child_process')
const { groups } = require('./e2e-groups')

function runGroup(groupName, extraArgs = []) {
  const specs = groups[groupName]

  if (!specs) {
    console.error(`[E2E] Unknown group "${groupName}". Available groups: ${Object.keys(groups).join(', ')}`)
    return 1
  }

  console.log(`\n[E2E] Running "${groupName}" suite (${specs.length} spec file(s))`)
  for (const spec of specs) {
    console.log(`  - ${spec}`)
  }
  console.log('')

  const pnpmCommand = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm'
  const result = spawnSync(pnpmCommand, ['exec', 'playwright', 'test', ...specs, ...extraArgs], {
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32'
  })

  if (result.error) {
    throw result.error
  }

  return result.status ?? 0
}

if (require.main === module) {
  const [groupName, ...extraArgs] = process.argv.slice(2)
  process.exit(runGroup(groupName, extraArgs))
}

module.exports = {
  runGroup
}
