import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

import ts from 'typescript'

export function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function collectLeafPaths(value, prefix = '') {
  if (!isPlainObject(value)) {
    return prefix ? [prefix] : []
  }

  return Object.keys(value)
    .sort()
    .flatMap((key) => collectLeafPaths(value[key], prefix ? `${prefix}.${key}` : key))
}

export function diffLocaleShape(base, candidate, prefix = '') {
  const missing = []
  const extra = []
  const mismatched = []

  if (!isPlainObject(base) || !isPlainObject(candidate)) {
    return { missing, extra, mismatched }
  }

  for (const key of Object.keys(base)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key
    if (!(key in candidate)) {
      missing.push(nextPrefix)
      continue
    }

    const baseValue = base[key]
    const candidateValue = candidate[key]

    if (isPlainObject(baseValue) !== isPlainObject(candidateValue)) {
      mismatched.push(nextPrefix)
      continue
    }

    if (isPlainObject(baseValue) && isPlainObject(candidateValue)) {
      const nested = diffLocaleShape(baseValue, candidateValue, nextPrefix)
      missing.push(...nested.missing)
      extra.push(...nested.extra)
      mismatched.push(...nested.mismatched)
    }
  }

  for (const key of Object.keys(candidate)) {
    if (!(key in base)) {
      extra.push(prefix ? `${prefix}.${key}` : key)
    }
  }

  return { missing, extra, mismatched }
}

function loadTsDefaultExport(filePath) {
  const source = fs.readFileSync(filePath, 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
    },
  }).outputText

  const context = {
    module: { exports: {} },
    exports: {},
  }

  vm.runInNewContext(compiled, context)
  return context.module.exports.default || context.exports.default
}

function getLocaleMessage(locale) {
  const filePath = path.join(
    process.cwd(),
    'packages',
    'ui',
    'src',
    'i18n',
    'locales',
    locale,
    'index.ts',
  )

  return loadTsDefaultExport(filePath)
}

function main() {
  const baseLocale = 'en-US'
  const otherLocales = ['zh-CN', 'zh-TW']
  const baseMessages = getLocaleMessage(baseLocale)
  let hasError = false

  for (const locale of otherLocales) {
    const candidateMessages = getLocaleMessage(locale)
    const diff = diffLocaleShape(baseMessages, candidateMessages)
    if (diff.missing.length === 0 && diff.extra.length === 0 && diff.mismatched.length === 0) {
      continue
    }

    hasError = true
    console.error(`[locale-parity] ${locale} does not match ${baseLocale}`)
    if (diff.missing.length > 0) {
      console.error(`  Missing keys (${diff.missing.length}):`)
      diff.missing.forEach((key) => console.error(`    - ${key}`))
    }
    if (diff.extra.length > 0) {
      console.error(`  Extra keys (${diff.extra.length}):`)
      diff.extra.forEach((key) => console.error(`    - ${key}`))
    }
    if (diff.mismatched.length > 0) {
      console.error(`  Shape mismatches (${diff.mismatched.length}):`)
      diff.mismatched.forEach((key) => console.error(`    - ${key}`))
    }
  }

  if (hasError) {
    process.exitCode = 1
    return
  }

  console.log('[locale-parity] Locale structures are aligned')
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  main()
}
