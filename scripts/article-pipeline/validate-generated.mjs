import { WEEKLY_DAY_AI } from './constants.mjs'

const LOCALES = ['zh', 'en']
const MAX_TITLE_LENGTH = 90
const MAX_EXCERPT_LENGTH = 220
const MAX_BLOCKS = 40

function fail(path, message) {
  throw new Error('Invalid generated article at ' + path + ': ' + message)
}

function truncateText(value, maxLength) {
  if ([...value].length <= maxLength) return value
  const truncated = [...value].slice(0, maxLength).join('').trimEnd()
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > Math.floor(maxLength * 0.6)) return truncated.slice(0, lastSpace).trimEnd()
  return truncated
}

function nonEmptyString(value, path, { maxLength = Number.POSITIVE_INFINITY, truncate = false } = {}) {
  if (typeof value !== 'string' || !value.trim()) fail(path, 'must be a non-empty string')
  const normalized = value.trim()
  if ([...normalized].length > maxLength) {
    if (!truncate) fail(path, 'must be at most ' + maxLength + ' characters')
    return truncateText(normalized, maxLength)
  }
  return normalized
}

function localizedString(value, path, { maxLength = Number.POSITIVE_INFINITY, truncate = false } = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object with zh and en')
  return {
    zh: nonEmptyString(value.zh, path + '.zh', { maxLength, truncate }),
    en: nonEmptyString(value.en, path + '.en', { maxLength, truncate }),
  }
}

function localizedTags(value, path) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail(path, 'must be an object with zh and en arrays')
  const result = {}
  for (const locale of LOCALES) {
    if (!Array.isArray(value[locale])) fail(path + '.' + locale, 'must be an array')
    const tags = value[locale].map((tag, index) => nonEmptyString(tag, path + '.' + locale + '[' + index + ']', { maxLength: 40 }))
    const unique = [...new Set(tags)]
    if (unique.length < 1 || unique.length > 6) fail(path + '.' + locale, 'must contain 1 to 6 unique tags')
    result[locale] = unique
  }
  return result
}

function normalizeSlug(value, fallback) {
  const source = typeof value === 'string' ? value : ''
  const ascii = source.normalize('NFKD').replace(/[^\x00-\x7F]/g, '')
  const slug = ascii.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 96)
  return slug || fallback
}

function validateBlocks(value, path) {
  if (!Array.isArray(value)) fail(path, 'must be an array')
  if (value.length < 3 || value.length > MAX_BLOCKS) fail(path, 'must contain 3 to ' + MAX_BLOCKS + ' blocks')

  let headingCount = 0
  const blocks = value.map((block, index) => {
    const blockPath = path + '[' + index + ']'
    if (!block || typeof block !== 'object' || Array.isArray(block)) fail(blockPath, 'must be an object')
    if (block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote') {
      if (block.type === 'heading') headingCount += 1
      return { type: block.type, text: localizedString(block.text, blockPath + '.text') }
    }
    if (block.type === 'code') {
      return {
        type: 'code',
        language: nonEmptyString(block.language, blockPath + '.language', { maxLength: 30 }),
        code: nonEmptyString(block.code, blockPath + '.code'),
      }
    }
    fail(blockPath + '.type', 'must be heading, paragraph, quote, or code')
  })
  if (headingCount < 1) fail(path, 'must contain at least one heading block')
  return blocks
}

function calculateReadingTime(content) {
  const text = content.zh.concat(content.en)
    .map((block) => block.type === 'code' ? block.code : block.text.zh + ' ' + block.text.en)
    .join(' ')
  const chineseCharacters = [...text].filter((char) => char >= '一' && char <= '鿿').length
  const latinWords = (text.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length
  return Math.min(60, Math.max(1, Math.ceil(Math.max(chineseCharacters / 450, latinWords / 220))))
}

export function validateGeneratedDraft(draft) {
  if (!draft || typeof draft !== 'object' || Array.isArray(draft)) fail('root', 'must be an object')
  const title = localizedString(draft.title, 'title', { maxLength: MAX_TITLE_LENGTH, truncate: true })
  const excerpt = localizedString(draft.excerpt, 'excerpt', { maxLength: MAX_EXCERPT_LENGTH, truncate: true })
  const category = localizedString(draft.category, 'category', { maxLength: 80 })
  const tags = localizedTags(draft.tags, 'tags')
  if (draft.slug !== undefined && typeof draft.slug !== 'string') fail('slug', 'must be a string when provided')
  const content = {
    zh: validateBlocks(draft.content?.zh, 'content.zh'),
    en: validateBlocks(draft.content?.en, 'content.en'),
  }
  return {
    slug: normalizeSlug(draft.slug, 'hacker-news-article'),
    title,
    excerpt,
    category,
    tags,
    content,
    readingTime: calculateReadingTime(content),
  }
}

export function createGeneratedArticleDocument(story, draft, {
  model,
  generatedAt = new Date().toISOString(),
  fetchedAt = generatedAt,
} = {}) {
  if (!story || !Number.isInteger(story.hnId) || story.hnId <= 0) fail('source.hnId', 'must be a positive integer')
  if (!model || typeof model !== 'string') fail('generation.model', 'must be a non-empty string')

  const normalized = validateGeneratedDraft(draft)
  const isoGeneratedAt = new Date(generatedAt).toISOString()
  const date = isoGeneratedAt.slice(0, 10)
  const slug = normalized.slug + '-hn-' + story.hnId

  return {
    schemaVersion: 1,
    source: {
      hnId: story.hnId,
      hnUrl: story.hnUrl,
      originalUrl: story.originalUrl,
      title: story.title,
      author: story.author,
      score: story.score,
      commentCount: story.commentCount,
      publishedAt: story.publishedAt,
      fetchedAt: new Date(fetchedAt).toISOString(),
    },
    generation: {
      provider: WEEKLY_DAY_AI.englishName,
      providerUrl: WEEKLY_DAY_AI.url,
      model,
      generatedAt: isoGeneratedAt,
    },
    post: {
      slug,
      date,
      publishedAt: isoGeneratedAt,
      readingTime: normalized.readingTime,
      category: normalized.category,
      tags: normalized.tags,
      title: normalized.title,
      excerpt: normalized.excerpt,
      disclosure: { ...WEEKLY_DAY_AI.disclosure },
      content: normalized.content,
    },
  }
}
