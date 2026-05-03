import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const readText = (relativePath) =>
  fs.readFileSync(path.join(process.cwd(), relativePath), 'utf8')

const collectMatches = (text, patterns) => {
  const matches = new Set()
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(text)) !== null) {
      matches.add(match[1])
    }
  }
  return matches
}

test('desktop preload IPC channels have main-process handlers', () => {
  const preload = readText('packages/desktop/preload.js')
  const main = readText('packages/desktop/main.js')

  const preloadChannels = collectMatches(preload, [
    /ipcRenderer\.invoke\(\s*['"]([^'"]+)['"]/g,
    /invokeFavorite\(\s*['"]([^'"]+)['"]/g,
  ])
  for (const eventName of collectMatches(preload, [
    /ipcRenderer\.invoke\(\s*IPC_EVENTS\.([A-Z0-9_]+)/g,
  ])) {
    preloadChannels.add(`IPC_EVENTS.${eventName}`)
  }

  const mainHandlers = collectMatches(main, [
    /ipcMain\.handle\(\s*['"]([^'"]+)['"]/g,
  ])
  for (const eventName of collectMatches(main, [
    /ipcMain\.handle\(\s*IPC_EVENTS\.([A-Z0-9_]+)/g,
  ])) {
    mainHandlers.add(`IPC_EVENTS.${eventName}`)
  }

  const missingHandlers = [...preloadChannels]
    .filter(channel => !mainHandlers.has(channel))
    .sort()

  assert.deepEqual(missingHandlers, [])
})

test('desktop preference bridge exposes only registered preference handlers', () => {
  const main = readText('packages/desktop/main.js')
  const mainHandlers = collectMatches(main, [
    /ipcMain\.handle\(\s*['"]([^'"]+)['"]/g,
  ])

  for (const channel of [
    'preference-get',
    'preference-set',
    'preference-delete',
    'preference-keys',
    'preference-clear',
    'preference-getAll',
    'preference-exportData',
    'preference-importData',
    'preference-getDataType',
    'preference-validateData',
  ]) {
    assert.equal(mainHandlers.has(channel), true, `Missing handler for ${channel}`)
  }
})
