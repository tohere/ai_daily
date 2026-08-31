import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

export async function loadPublishedHnIds(directory, { onWarning = console.warn } = {}) {
  let entries
  try {
    entries = await readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error?.code === 'ENOENT') return new Set()
    throw error
  }

  const ids = new Set()
  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
    .sort((left, right) => left.name.localeCompare(right.name))

  for (const entry of jsonFiles) {
    const filePath = path.join(directory, entry.name)
    try {
      const document = JSON.parse(await readFile(filePath, 'utf8'))
      const hnId = document?.source?.hnId
      if (!Number.isInteger(hnId) || hnId <= 0) {
        onWarning(`Skipping ${filePath}: source.hnId is missing or invalid`)
        continue
      }
      ids.add(hnId)
    } catch (error) {
      onWarning(`Skipping ${filePath}: ${error.message}`)
    }
  }

  return ids
}
