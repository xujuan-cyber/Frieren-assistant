import { describe, expect, it } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const servicesDir = join(process.cwd(), 'src', 'services')

const findElectronProxyFiles = (dir: string): string[] => {
  const entries = readdirSync(dir, { withFileTypes: true })
  const files: string[] = []

  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    if (entry.isDirectory()) {
      files.push(...findElectronProxyFiles(fullPath))
    } else if (entry.isFile() && entry.name === 'electron-proxy.ts') {
      files.push(fullPath)
    }
  }

  return files
}

const SERIALIZATION_REQUIRED = [
  /:\s*ImageRequest\b/,
  /:\s*Text2ImageRequest\b/,
  /:\s*Image2ImageRequest\b/,
  /:\s*MultiImageGenerationRequest\b/,
  /:\s*MultiImageRequest\b/,
  /:\s*ImageModelConfig\b/,
  /:\s*Partial<ImageModelConfig>\b/,
  /:\s*Record<string,\s*(?:unknown|any)>\b/,
  /:\s*unknown\b/,
  /:\s*any\b/,
  /\.\.\.args:\s*any\[\]/,
]

const SAFE_SERIALIZATION = /safeSerializeForIPC|safeSerializeArgs/

describe('Electron proxy IPC serialization guard', () => {
  it('uses shared IPC serialization in proxies that accept complex payloads', () => {
    const offenders = findElectronProxyFiles(servicesDir)
      .map((path) => ({
        path,
        content: readFileSync(path, 'utf8'),
      }))
      .filter(({ content }) => SERIALIZATION_REQUIRED.some((pattern) => pattern.test(content)))
      .filter(({ content }) => !SAFE_SERIALIZATION.test(content))
      .map(({ path }) => relative(process.cwd(), path))

    expect(offenders).toEqual([])
  })
})
