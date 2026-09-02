import { WEEKLY_DAY_AI } from './constants.mjs'

const LOCALES = ['zh', 'en']
const MAX_TITLE_LENGTH = 90
const MAX_EXCERPT_LENGTH = 220
const MAX_BLOCKS = 40
const MIN_PARAGRAPHS = 6
const MIN_ZH_CHARACTERS = 900
const MIN_EN_WORDS = 450

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

function textFromBlock(block, locale) {
  if (typeof block === 'string') return block.trim()
  if (!block || typeof block !== 'object') return ''
  if (typeof block.text === 'string') return block.text.trim()
  if (block.text && typeof block.text === 'object') {
    return String(block.text[locale] ?? block.text.zh ?? block.text.en ?? '').trim()
  }
  if (typeof block.content === 'string') return block.content.trim()
  if (typeof block.heading === 'string') return block.heading.trim()
  if (typeof block.paragraph === 'string') return block.paragraph.trim()
  if (typeof block.code === 'string') return block.code.trim()
  return ''
}

function typeFromBlock(block) {
  if (block?.type === 'heading' || block?.type === 'quote' || block?.type === 'code') return block.type
  if (typeof block?.heading === 'string') return 'heading'
  return 'paragraph'
}

function isNativeBlockArray(value) {
  return Array.isArray(value) && value.every((block) => {
    if (!block || typeof block !== 'object' || Array.isArray(block)) return false
    if (block.type === 'code') return typeof block.language === 'string' && typeof block.code === 'string'
    return (block.type === 'heading' || block.type === 'paragraph' || block.type === 'quote')
      && block.text
      && typeof block.text === 'object'
      && !Array.isArray(block.text)
      && typeof block.text.zh === 'string'
      && block.text.zh.trim()
      && typeof block.text.en === 'string'
      && block.text.en.trim()
  })
}

function markdownToBlocks(value, fallbackTitle) {
  const text = value.trim()
  if (!text) return []
  let chunks = text.split(/\r?\n\s*\r?\n+/).map((chunk) => chunk.trim()).filter(Boolean)
  if (chunks.length === 1 && text.includes('\n')) {
    chunks = text.split(/\r?\n/).map((chunk) => chunk.trim()).filter(Boolean)
  }

  const blocks = []
  for (const chunk of chunks) {
    const lines = chunk.split(/\r?\n/).map((line) => line.trim()).filter(Boolean)
    const headingMatch = lines[0]?.match(/^#{1,6}\s+(.+)$/)
    if (headingMatch) {
      blocks.push({ type: 'heading', text: headingMatch[1].trim() })
      const paragraph = lines.slice(1).join(' ').trim()
      if (paragraph) blocks.push({ type: 'paragraph', text: paragraph })
    } else {
      blocks.push({ type: 'paragraph', text: lines.join(' ').trim() })
    }
  }
  if (!blocks.some((block) => block.type === 'heading') && fallbackTitle) {
    blocks.unshift({ type: 'heading', text: fallbackTitle })
  }
  return blocks
}

function objectToBlocks(value, fallbackTitle, locale) {
  const blocks = []
  if (typeof value.title === 'string' && value.title.trim()) {
    blocks.push({ type: 'heading', text: value.title.trim() })
  } else if (fallbackTitle) {
    blocks.push({ type: 'heading', text: fallbackTitle })
  }

  for (const [key, item] of Object.entries(value)) {
    if (['title', 'locale', 'language'].includes(key)) continue
    if (typeof item === 'string' && item.trim()) {
      if (key === 'content' || key === 'text' || key === 'body' || key === 'paragraph') {
        blocks.push(...markdownToBlocks(item, ''))
      } else {
        blocks.push({ type: 'heading', text: key })
        blocks.push({ type: 'paragraph', text: item.trim() })
      }
      continue
    }
    if (Array.isArray(item)) {
      blocks.push({ type: 'heading', text: key })
      blocks.push(...item)
      continue
    }
    if (item && typeof item === 'object') {
      const nested = coerceContentBlocks(item, key, locale)
      if (Array.isArray(nested)) {
        blocks.push({ type: 'heading', text: key })
        blocks.push(...nested)
      }
    }
  }
  return blocks
}

function coerceContentBlocks(value, fallbackTitle, locale) {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    const text = value.trim()
    if (!text) return []
    if (text.startsWith('[')) {
      try {
        const parsed = JSON.parse(text)
        if (Array.isArray(parsed)) return parsed
      } catch {
        // Treat the value as Markdown/plain text when it is not a JSON array.
      }
    }
    return markdownToBlocks(text, fallbackTitle)
  }
  if (value && typeof value === 'object') {
    if (Array.isArray(value[locale])) return coerceContentBlocks(value[locale], fallbackTitle, locale)
    if (value.type || typeof value.text === 'string' || typeof value.content === 'string') {
      return [value]
    }
    for (const key of ['blocks', 'sections', 'paragraphs']) {
      if (Array.isArray(value[key])) {
        const blocks = value[key]
        return value.title ? [{ type: 'heading', text: value.title }, ...blocks] : blocks
      }
    }
    return objectToBlocks(value, fallbackTitle, locale)
  }
  return value
}

function normalizeContent(draftContent, title) {
  const raw = draftContent && typeof draftContent === 'object' && !Array.isArray(draftContent) ? draftContent : {}
  const zh = coerceContentBlocks(raw.zh, title.zh, 'zh')
  const en = coerceContentBlocks(raw.en, title.en, 'en')
  if (isNativeBlockArray(raw.zh) && isNativeBlockArray(raw.en)) return { zh, en }
  if (!Array.isArray(zh) || !Array.isArray(en)) return { zh, en }

  const length = Math.max(zh.length, en.length)
  const paired = Array.from({ length }, (_, index) => {
    const zhBlock = zh[index] ?? en[index]
    const enBlock = en[index] ?? zh[index]
    const zhType = typeFromBlock(zhBlock)
    const enType = typeFromBlock(enBlock)
    if (zhType === 'code' || enType === 'code') {
      const codeBlock = zhType === 'code' ? zhBlock : enBlock
      return {
        type: 'code',
        language: typeof codeBlock.language === 'string' && codeBlock.language.trim() ? codeBlock.language : 'text',
        code: typeof codeBlock.code === 'string' ? codeBlock.code : textFromBlock(codeBlock, 'en'),
      }
    }
    const type = zhType === 'heading' || enType === 'heading'
      ? 'heading'
      : zhType === 'quote' || enType === 'quote' ? 'quote' : 'paragraph'
    return {
      type,
      text: {
        zh: textFromBlock(zhBlock, 'zh'),
        en: textFromBlock(enBlock, 'en'),
      },
    }
  })
  return { zh: paired, en: paired }
}

function countLocaleText(content, locale) {
  return content
    .map((block) => block.type === 'code' ? block.code : block.text[locale])
    .join(' ')
    .trim()
}

function countEnglishWords(value) {
  return (value.match(/[A-Za-z0-9]+(?:['’-][A-Za-z0-9]+)*/g) ?? []).length
}

function validateContentLength(content) {
  for (const locale of LOCALES) {
    const paragraphs = content[locale].filter((block) => block.type === 'paragraph').length
    if (paragraphs < MIN_PARAGRAPHS) {
      fail('content.' + locale, 'must contain at least ' + MIN_PARAGRAPHS + ' paragraph blocks')
    }
  }

  const zhCharacters = [...countLocaleText(content.zh, 'zh')].filter((char) => char >= '一' && char <= '鿿').length
  if (zhCharacters < MIN_ZH_CHARACTERS) {
    fail('content.zh', 'must contain at least ' + MIN_ZH_CHARACTERS + ' Chinese characters')
  }

  const enWords = countEnglishWords(countLocaleText(content.en, 'en'))
  if (enWords < MIN_EN_WORDS) {
    fail('content.en', 'must contain at least ' + MIN_EN_WORDS + ' English words')
  }
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
  const normalizedContent = normalizeContent(draft.content, title)
  const content = {
    zh: validateBlocks(normalizedContent.zh, 'content.zh'),
    en: validateBlocks(normalizedContent.en, 'content.en'),
  }
  validateContentLength(content)
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
