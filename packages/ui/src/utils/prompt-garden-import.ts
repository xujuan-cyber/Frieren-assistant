export const normalizePromptGardenImportCode = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) return ''

  try {
    const url = new URL(trimmed)
    const directImportCode = url.searchParams.get('importCode')?.trim()
    if (directImportCode) return directImportCode

    const hashQueryIndex = url.hash.indexOf('?')
    if (hashQueryIndex >= 0) {
      const hashQuery = new URLSearchParams(url.hash.slice(hashQueryIndex + 1))
      return hashQuery.get('importCode')?.trim() || trimmed
    }
  } catch {
    // Plain import codes are expected; non-URL values are used as-is.
  }

  return trimmed
}
