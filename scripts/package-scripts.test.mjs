import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8'))

test('root lint includes UI lint plus core and mcp-server checks', () => {
  const rootPackage = readJson('package.json')

  assert.equal(typeof rootPackage.scripts?.lint, 'string')
  assert.match(rootPackage.scripts.lint, /\blint:ui\b/)
  assert.match(rootPackage.scripts.lint, /\blint:mcp-server\b/)
  assert.match(rootPackage.scripts.lint, /\btypecheck:core\b/)
  assert.match(rootPackage.scripts.lint, /\btypecheck:mcp-server\b/)
  assert.equal(typeof rootPackage.scripts?.['lint:ui'], 'string')
  assert.equal(typeof rootPackage.scripts?.['lint:mcp-server'], 'string')
  assert.equal(typeof rootPackage.scripts?.['typecheck:core'], 'string')
  assert.equal(typeof rootPackage.scripts?.['typecheck:mcp-server'], 'string')
})

test('repo checks execute package script coverage tests', () => {
  const rootPackage = readJson('package.json')

  assert.equal(typeof rootPackage.scripts?.['test:repo'], 'string')
  assert.match(rootPackage.scripts['test:repo'], /scripts\/package-scripts\.test\.mjs/)
})

test('core package exposes a dedicated typecheck script', () => {
  const corePackage = readJson(path.join('packages', 'core', 'package.json'))

  assert.equal(typeof corePackage.scripts?.typecheck, 'string')
  assert.match(corePackage.scripts.typecheck, /\btsc\b/)
  assert.match(corePackage.scripts.typecheck, /--noEmit/)
})

test('mcp-server bin points to a file that exists before build output is generated', () => {
  const mcpPackagePath = path.join('packages', 'mcp-server', 'package.json')
  const mcpPackage = readJson(mcpPackagePath)
  const binEntry = mcpPackage.bin?.['prompt-optimizer-mcp']

  assert.equal(typeof binEntry, 'string')

  const binTargetPath = path.join(path.dirname(mcpPackagePath), binEntry)
  assert.equal(
    fs.existsSync(binTargetPath),
    true,
    `Expected ${binTargetPath} to exist so pnpm can create the workspace bin shim during install`,
  )
})
