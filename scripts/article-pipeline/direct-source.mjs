import { fetchOriginalArticle } from './source-context.mjs'

const MAX_TITLE_LENGTH = 120

// 解析 URL 列表：支持空格、逗号、换行分隔，自动去重
export function parseUrlList(value) {
  if (typeof value !== 'string') return []
  return [...new Set(value.split(/[\s,]+/).map((item) => item.trim()).filter(Boolean))]
}

function normalizeSourceUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('URL must use HTTP or HTTPS')
  }
  return url.toString()
}

// 指定链接模式：直接读取用户提供的文章并构造生成用 story（无 HN 元数据）
export async function selectStoriesFromUrls({
  urls,
  publishedOriginalUrls = new Set(),
  fetchImpl = globalThis.fetch,
  now = new Date(),
  sourceOptions = {},
  onWarning = console.warn,
} = {}) {
  if (!Array.isArray(urls) || urls.length === 0) throw new Error('At least one article URL is required')

  const stories = []
  const seen = new Set()
  for (const rawUrl of urls) {
    let normalizedUrl
    try {
      normalizedUrl = normalizeSourceUrl(rawUrl)
    } catch (error) {
      onWarning('Skipping invalid URL "' + rawUrl + '": ' + error.message)
      continue
    }
    if (seen.has(normalizedUrl)) continue
    if (publishedOriginalUrls.has(normalizedUrl)) {
      onWarning('Skipping already published URL: ' + normalizedUrl)
      continue
    }
    seen.add(normalizedUrl)

    const { title, text } = await fetchOriginalArticle(normalizedUrl, {
      fetchImpl,
      now,
      ...sourceOptions,
    })
    if (!text.trim()) {
      throw new Error('Unable to read usable content from ' + normalizedUrl + ' (the page may block bots or render via JS)')
    }

    let hostname = normalizedUrl
    try {
      hostname = new URL(normalizedUrl).hostname
    } catch {
      // hostname 仅用于展示，解析失败时退回完整 URL
    }

    stories.push({
      hnId: null,
      hnUrl: null,
      originalUrl: normalizedUrl,
      title: title || hostname,
      author: hostname,
      score: 0,
      commentCount: 0,
      publishedAt: now.toISOString(),
      sourceText: text,
    })
  }

  if (stories.length === 0) throw new Error('No valid article URLs were provided')
  return { selected: stories }
}
