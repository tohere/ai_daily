import { AI_TOPIC_KEYWORDS, HN_API_BASE_URL, HN_ITEM_URL_PREFIX } from './constants.mjs'

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

export async function fetchJsonWithRetry(url, {
  fetchImpl = globalThis.fetch,
  retries = 3,
  timeoutMs = 12000,
  retryDelayMs = 300,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required')

  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetchImpl(url, {
        headers: { accept: 'application/json', 'user-agent': 'AI-Daily/1.0 (+https://www.weekly-day.top/)' },
        signal: controller.signal,
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} for ${url}`)
      return await response.json()
    } catch (error) {
      lastError = error
      if (attempt === retries) break
      await sleep(retryDelayMs * (2 ** attempt))
    } finally {
      clearTimeout(timeout)
    }
  }

  throw new Error(`Failed to fetch ${url} after ${retries + 1} attempt(s): ${lastError?.message ?? lastError}`)
}

export async function fetchTopStoryIds({ fetchImpl, limit = 50, retries, timeoutMs } = {}) {
  const result = await fetchJsonWithRetry(`${HN_API_BASE_URL}/topstories.json`, { fetchImpl, retries, timeoutMs })
  if (!Array.isArray(result)) throw new Error('Hacker News topstories response must be an array')
  return result.filter((id) => Number.isInteger(id) && id > 0).slice(0, limit)
}

export async function fetchHackerNewsItem(id, { fetchImpl, retries, timeoutMs } = {}) {
  if (!Number.isInteger(id) || id <= 0) throw new Error(`Invalid Hacker News item id: ${id}`)
  return fetchJsonWithRetry(`${HN_API_BASE_URL}/item/${id}.json`, { fetchImpl, retries, timeoutMs })
}

function parseExternalUrl(value) {
  try {
    const url = new URL(value)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    if (url.hostname === 'news.ycombinator.com') return null
    return url.toString()
  } catch {
    return null
  }
}

export function normalizeHackerNewsStory(item) {
  if (!item || item.type !== 'story' || item.deleted || item.dead) return null
  const originalUrl = parseExternalUrl(item.url)
  if (!originalUrl || !Number.isInteger(item.id) || item.id <= 0) return null
  if (typeof item.title !== 'string' || !item.title.trim()) return null
  if (typeof item.by !== 'string' || !item.by.trim()) return null
  if (!Number.isFinite(item.time) || item.time <= 0) return null

  return {
    hnId: item.id,
    hnUrl: `${HN_ITEM_URL_PREFIX}${item.id}`,
    originalUrl,
    title: item.title.trim(),
    author: item.by.trim(),
    score: Math.max(0, Number.isFinite(item.score) ? Math.trunc(item.score) : 0),
    commentCount: Math.max(0, Number.isFinite(item.descendants) ? Math.trunc(item.descendants) : 0),
    publishedAt: new Date(item.time * 1000).toISOString(),
  }
}

function normalizeTopicText(value) {
  return typeof value === 'string'
    ? value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()
    : ''
}

export function isAiRelatedStory(story, keywords = AI_TOPIC_KEYWORDS) {
  if (!story) return false
  const text = normalizeTopicText([story.title, story.originalUrl].join(' '))
  return keywords.some((keyword) => {
    const normalizedKeyword = normalizeTopicText(keyword)
    return normalizedKeyword && (' ' + text + ' ').includes(' ' + normalizedKeyword + ' ')
  })
}

export function calculateStoryRank(story, now = new Date()) {
  const ageHours = Math.max(0, (now.getTime() - Date.parse(story.publishedAt)) / 3_600_000)
  const freshnessBonus = Math.max(0, 72 - ageHours) * 2
  return Number((story.score + story.commentCount * 1.5 + freshnessBonus).toFixed(3))
}

async function mapWithConcurrency(values, concurrency, mapper) {
  const results = new Array(values.length)
  let cursor = 0

  async function worker() {
    while (cursor < values.length) {
      const index = cursor
      cursor += 1
      results[index] = await mapper(values[index], index)
    }
  }

  const workerCount = Math.min(Math.max(1, concurrency), values.length || 1)
  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return results
}

export async function selectHackerNewsStories({
  count = 2,
  fetchLimit = 50,
  minScore = 50,
  minComments = 10,
  fetchConcurrency = 8,
  requestTimeoutMs = 12000,
  requestRetries = 3,
  publishedHnIds = new Set(),
  fetchImpl = globalThis.fetch,
  now = new Date(),
  onWarning = console.warn,
  aiKeywords = AI_TOPIC_KEYWORDS,
} = {}) {
  const ids = await fetchTopStoryIds({ fetchImpl, limit: fetchLimit, retries: requestRetries, timeoutMs: requestTimeoutMs })
  let fetchFailures = 0

  const items = await mapWithConcurrency(ids, fetchConcurrency, async (id) => {
    try {
      return await fetchHackerNewsItem(id, { fetchImpl, retries: requestRetries, timeoutMs: requestTimeoutMs })
    } catch (error) {
      fetchFailures += 1
      onWarning(`Skipping Hacker News item ${id}: ${error.message}`)
      return null
    }
  })

  const normalized = items.map(normalizeHackerNewsStory).filter(Boolean)
  const topicMatched = normalized.filter((story) => isAiRelatedStory(story, aiKeywords))
  const eligible = topicMatched
    .filter((story) => story.score >= minScore)
    .filter((story) => story.commentCount >= minComments)
    .filter((story) => !publishedHnIds.has(story.hnId))
    .map((story) => ({ ...story, rank: calculateStoryRank(story, now) }))
    .sort((left, right) => right.rank - left.rank || right.score - left.score || right.hnId - left.hnId)

  const selected = eligible.slice(0, count)
  if (selected.length < count) {
    throw new Error(`Only ${selected.length} eligible Hacker News stories found; ${count} required. Fetched ${ids.length} ids, normalized ${normalized.length}, and skipped ${publishedHnIds.size} published id(s).`)
  }

  return {
    selected,
    stats: {
      requested: count,
      topStoryIds: ids.length,
      normalized: normalized.length,
      topicMatched: topicMatched.length,
      eligible: eligible.length,
      fetchFailures,
      publishedIds: publishedHnIds.size,
    },
  }
}
