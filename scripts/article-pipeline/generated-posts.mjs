import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export async function loadPublishedHnIds(directory, { onWarning = console.warn } = {}) {
  const { hnIds } = await loadPublishedSources(directory, { onWarning })
  return hnIds
}

// 一次性加载已发布的 HN id 与原文 URL，供各选题模式去重
export async function loadPublishedSources(directory, { onWarning = console.warn } = {}) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return { hnIds: new Set(), originalUrls: new Set() }
    throw error
  }

  const hnIds = new Set()
  const originalUrls = new Set()
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of jsonFiles) {
    const filePath = path.join(directory, entry.name)
    try {
      const document = JSON.parse(await readFile(filePath, 'utf8'))
      const hnId = document?.source?.hnId
      if (Number.isInteger(hnId) && hnId > 0) hnIds.add(hnId)
      const originalUrl = document?.source?.originalUrl
      if (typeof originalUrl === 'string' && originalUrl.trim()) originalUrls.add(originalUrl.trim())
    } catch (error) {
      onWarning(`Skipping ${filePath}: ${error.message}`)
    }
  }

  return { hnIds, originalUrls }
}
