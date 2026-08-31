import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadHackerNewsConfig } from './config.mjs'
import { loadPublishedHnIds } from './generated-posts.mjs'
import { selectHackerNewsStories } from './hacker-news.mjs'

const currentDirectory = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(currentDirectory, '..', '..')
const generatedPostsDirectory = path.join(projectRoot, 'src', 'data', 'generated-posts')

function readCountArgument(argv, fallback) {
  const index = argv.findIndex((argument) => argument === '--count' || argument.startsWith('--count='))
  if (index === -1) return fallback
  const raw = argv[index].includes('=') ? argv[index].split('=')[1] : argv[index + 1]
  const count = Number.parseInt(raw, 10)
  if (!Number.isInteger(count) || count <= 0) throw new Error(`Invalid --count value: ${raw}`)
  return count
}

const config = loadHackerNewsConfig()
const count = readCountArgument(process.argv.slice(2), config.dailyArticleCount)
const publishedHnIds = await loadPublishedHnIds(generatedPostsDirectory)
const result = await selectHackerNewsStories({
  count,
  fetchLimit: Math.max(config.fetchLimit, count),
  minScore: config.minScore,
  minComments: config.minComments,
  fetchConcurrency: config.fetchConcurrency,
  requestTimeoutMs: config.requestTimeoutMs,
  requestRetries: config.requestRetries,
  publishedHnIds,
})

console.log(JSON.stringify({
  generatedPostsDirectory,
  selected: result.selected,
  stats: result.stats,
}, null, 2))
