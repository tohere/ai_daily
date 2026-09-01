import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { requestArticleDraft } from './ai.mjs'
import { fetchOriginalArticleText } from './source-context.mjs'
import { createGeneratedArticleDocument } from './validate-generated.mjs'

export async function generateArticleDocument(story, {
  config,
  fetchImpl = globalThis.fetch,
  sourceFetchImpl = fetchImpl,
  sourceText,
  now = new Date(),
  sourceOptions = {},
  aiOptions = {},
} = {}) {
  if (!story) throw new Error('A Hacker News story is required')
  if (!config?.model) throw new Error('AI config with model is required')
  const generatedAt = now.toISOString()
  const resolvedSourceText = sourceText === undefined
    ? await fetchOriginalArticleText(story.originalUrl, { fetchImpl: sourceFetchImpl, ...sourceOptions })
    : sourceText
  const draft = await requestArticleDraft(story, resolvedSourceText, { config, fetchImpl, ...aiOptions })
  return createGeneratedArticleDocument(story, draft, {
    model: config.model,
    generatedAt,
    fetchedAt: generatedAt,
  })
}

export function buildGeneratedPostFilename(document) {
  return document.post.date + '-hn-' + document.source.hnId + '.json'
}

export async function writeGeneratedArticle(document, directory) {
  if (!document?.source?.hnId || !document?.post?.date) throw new Error('A complete generated article document is required')
  await mkdir(directory, { recursive: true })
  const filePath = path.join(directory, buildGeneratedPostFilename(document))
  await writeFile(filePath, JSON.stringify(document, null, 2) + '\n', { encoding: 'utf8', flag: 'wx' })
  return filePath
}
