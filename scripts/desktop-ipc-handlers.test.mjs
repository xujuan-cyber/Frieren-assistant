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
  const main = [
    readText('packages/desktop/main.js'),
    readText('packages/desktop/remote-storage.js'),
  ].join('\n')

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

test('desktop remote storage handler routes S3-compatible operations through AWS SDK commands', async () => {
  const { handleRemoteStorageOperation } = await import('../packages/desktop/remote-storage.js')
  const sentCommands = []

  class S3Client {
    constructor(config) {
      this.config = config
    }

    async send(command) {
      sentCommands.push(command)
      return {}
    }
  }

  class PutObjectCommand {
    constructor(input) {
      this.input = input
    }
  }

  const result = await handleRemoteStorageOperation({
    operation: 'put',
    path: 'v1/manifest.json',
    body: new Uint8Array([104, 105]),
    contentType: 'application/json',
    provider: {
      kind: 'cloudflare-r2',
      accountId: 'account-id',
      bucket: 'po',
      accessKeyId: 'ak',
      secretAccessKey: 'sk',
    },
  }, {
    S3Client,
    PutObjectCommand,
  })

  assert.equal(result.path, 'v1/manifest.json')
  assert.equal(result.sizeBytes, 2)
  assert.equal(sentCommands.length, 1)
  assert.deepEqual(sentCommands[0].input, {
    Bucket: 'po',
    Key: 'prompt-optimizer-backups/v1/manifest.json',
    Body: new Uint8Array([104, 105]),
    ContentType: 'application/json',
  })
})

test('desktop remote storage handler routes WebDAV operations through the WebDAV client library adapter', async () => {
  const { handleRemoteStorageOperation } = await import('../packages/desktop/remote-storage.js')
  const calls = []
  const client = {
    async createDirectory(path, options) {
      calls.push(['createDirectory', path, options])
    },
    async putFileContents(path, body, options) {
      calls.push(['putFileContents', path, body, options])
      assert.equal(Buffer.isBuffer(body), true)
      assert.deepEqual([...body], [0, 1, 127, 128, 255])
    },
    async getDirectoryContents(path, options) {
      calls.push(['getDirectoryContents', path, options])
      return [
        {
          filename: '/prompt-optimizer-backups/v1/manifest.json',
          type: 'file',
          size: 12,
          lastmod: '2026-05-07T00:00:00.000Z',
          mime: 'application/json',
        },
      ]
    },
  }

  const dependencies = {
    createWebDavClient: async (endpoint, options) => {
      calls.push(['createWebDavClient', endpoint, options])
      return client
    },
  }

  await handleRemoteStorageOperation({
    operation: 'put',
    path: 'v1/assets/image.bin',
    body: new Uint8Array([0, 1, 127, 128, 255]),
    contentType: 'application/octet-stream',
    provider: {
      kind: 'webdav',
      endpoint: 'https://dav.example.test',
      username: 'user',
      password: 'pass',
      directory: 'prompt-optimizer-backups',
    },
  }, dependencies)

  const entries = await handleRemoteStorageOperation({
    operation: 'list',
    path: 'v1',
    provider: {
      kind: 'webdav',
      endpoint: 'https://dav.example.test',
      username: 'user',
      password: 'pass',
      directory: 'prompt-optimizer-backups',
    },
  }, dependencies)

  assert.equal(calls.some(([name]) => name === 'putFileContents'), true)
  assert.equal(calls.some(([name]) => name === 'getDirectoryContents'), true)
  assert.deepEqual(entries, [
    {
      path: 'v1/manifest.json',
      sizeBytes: 12,
      updatedAt: '2026-05-07T00:00:00.000Z',
      contentType: 'application/json',
    },
  ])
})

test('desktop remote storage rejects Google Drive provider', async () => {
  const { handleRemoteStorageOperation } = await import('../packages/desktop/remote-storage.js')

  await assert.rejects(
    () => handleRemoteStorageOperation({
      operation: 'authorize',
      provider: { kind: 'google-drive' },
    }),
    /Google Drive remote backup is only supported in the Web version/,
  )
})

test('desktop remote storage implementation avoids renderer fetch/WebDAV XML paths', () => {
  const remoteStorage = readText('packages/desktop/remote-storage.js')

  assert.match(remoteStorage, /require\('@aws-sdk\/client-s3'\)/)
  assert.match(remoteStorage, /require\('webdav'\)/)
  assert.doesNotMatch(remoteStorage, /\bfetch\s*\(/)
  assert.doesNotMatch(remoteStorage, /\bPROPFIND\b|\bMKCOL\b/)
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
