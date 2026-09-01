import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { loadAiConfig } from './ai.mjs'
import { loadHackerNewsConfig } from './config.mjs'
import { writeGeneratedArticle, generateArticleDocument } from './generate-article.mjs'
import { loadPublishedHnIds } from './generated-posts.mjs'
import { selectHackerNewsStories } from './hacker-news.mjs'

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectDirectory = path.resolve(scriptDirectory, '../..')
const generatedPostsDirectory = path.join(projectDirectory, 'src/data/generated-posts')

export async function publishDailyArticles({
  env = process.env,
  now = new Date(),
  fetchImpl = globalThis.fetch,
  sourceFetchImpl = fetchImpl,
  outputDirectory = generatedPostsDirectory,
  onLog = console.log,
  onWarning = console.warn,
} = {}) {
  const hnConfig = loadHackerNewsConfig(env)
  const aiConfig = loadAiConfig(env)
  const publishedHnIds = await loadPublishedHnIds(outputDirectory, { onWarning })
  const selection = await selectHackerNewsStories({
    ...hnConfig,
    publishedHnIds,
    fetchImpl,
    now,
    onWarning,
  })

  onLog('[daily-publish] selected ' + selection.selected.length + ' Hacker News stories')
  const documents = []
  for (const story of selection.selected) {
    onLog('[daily-publish] generating HN #' + story.hnId + ': ' + story.title)
    const document = await generateArticleDocument(story, {
      config: aiConfig,
      fetchImpl,
      sourceFetchImpl,
      now,
    })
    documents.push(document)
  }

  const writtenFiles = []
  for (const document of documents) {
    const filePath = await writeGeneratedArticle(document, outputDirectory)
    writtenFiles.push(filePath)
    onLog('[daily-publish] wrote ' + filePath)
  }

  return { selection, documents, writtenFiles }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const result = await publishDailyArticles()
    console.log('[daily-publish] completed: ' + result.writtenFiles.length + ' article(s)')
  } catch (error) {
    console.error('[daily-publish] failed:', error)
    process.exitCode = 1
  }
}
