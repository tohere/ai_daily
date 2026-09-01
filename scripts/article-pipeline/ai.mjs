import { fetchJsonWithRetry } from './hacker-news.mjs'

function requiredString(env, name) {
  const value = env[name]?.trim()
  if (!value) throw new Error(name + ' is required')
  return value
}

function readInteger(env, name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(name + ' must be an integer between ' + min + ' and ' + max + '; received ' + raw)
  }
  return value
}

export function loadAiConfig(env = process.env) {
  const rawBaseUrl = requiredString(env, 'WEEKLY_DAY_AI_BASE_URL').replace(/\/+$/, '')
  const endpoint = rawBaseUrl.endsWith('/chat/completions') ? rawBaseUrl : rawBaseUrl + '/chat/completions'
  const temperature = Number(env.WEEKLY_DAY_AI_TEMPERATURE ?? 0.4)
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error('WEEKLY_DAY_AI_TEMPERATURE must be between 0 and 2; received ' + temperature)
  }

  return Object.freeze({
    baseUrl: rawBaseUrl,
    endpoint,
    apiKey: requiredString(env, 'WEEKLY_DAY_AI_API_KEY'),
    model: requiredString(env, 'WEEKLY_DAY_AI_MODEL'),
    temperature,
    maxTokens: readInteger(env, 'WEEKLY_DAY_AI_MAX_TOKENS', 5000, { min: 500, max: 20000 }),
    requestTimeoutMs: readInteger(env, 'WEEKLY_DAY_AI_REQUEST_TIMEOUT_MS', 90000, { min: 5000, max: 180000 }),
    requestRetries: readInteger(env, 'WEEKLY_DAY_AI_REQUEST_RETRIES', 2, { min: 0, max: 6 }),
  })
}

function compactText(value, limit) {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, limit) : ''
}

export function buildArticlePrompt(story, sourceText = '') {
  const context = {
    hackerNews: {
      id: story.hnId,
      title: story.title,
      author: story.author,
      score: story.score,
      commentCount: story.commentCount,
      publishedAt: story.publishedAt,
      hackerNewsUrl: story.hnUrl,
      originalUrl: story.originalUrl,
    },
    originalArticleExcerpt: compactText(sourceText, 12000)
      || '[Original article text was unavailable. Use only Hacker News metadata and keep claims cautious.]',
  }

  return [
    'You are an editorial assistant for AI Daily. Produce a careful, original bilingual article based only on the supplied Hacker News context.',
    'Return ONLY one valid JSON object. Do not use Markdown fences or commentary before or after the JSON.',
    'Do not copy long passages from the source. Summarize, explain, and add cautious analysis. Never invent facts, numbers, quotes, or capabilities.',
    'Write both Chinese and English versions with equivalent meaning. Every localized string must be non-empty in both languages.',
    'Use 2 to 4 heading blocks and at least 4 paragraph blocks per language. A quote block is optional. Avoid code blocks unless the source genuinely contains a short code example.',
    'The first paragraph must not be the disclosure; the application prepends the disclosure deterministically.',
    'Return this exact shape: { title: { zh, en }, excerpt: { zh, en }, category: { zh, en }, tags: { zh: [], en: [] }, slug: string, content: { zh: PostBlock[], en: PostBlock[] } }.',
    'PostBlock is one of { type: heading, text: { zh, en } }, { type: paragraph, text: { zh, en } }, { type: quote, text: { zh, en } }, or { type: code, language, code }. Use localized text for heading, paragraph, and quote.',
    'Use a short lowercase ASCII slug with hyphens. Keep each title under 80 characters, each excerpt under 180 characters, and tags to 2-5 concise items. Never exceed these limits.',
    '',
    'SOURCE CONTEXT:',
    JSON.stringify(context, null, 2),
  ].join('\n')
}

function extractMessageContent(payload) {
  const content = payload?.choices?.[0]?.message?.content
  if (typeof content === 'string') return content
  if (Array.isArray(content)) {
    return content
      .filter((part) => part?.type === 'text' && typeof part.text === 'string')
      .map((part) => part.text)
      .join('')
  }
  return ''
}

function parseJsonResponse(content) {
  const unfenced = content
    .trim()
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/, '')
    .trim()

  try {
    return JSON.parse(unfenced)
  } catch (error) {
    throw new Error('AI response was not valid JSON: ' + error.message)
  }
}

export async function requestArticleDraft(story, sourceText, {
  config,
  fetchImpl = globalThis.fetch,
  retryDelayMs = 500,
} = {}) {
  if (!config) throw new Error('AI config is required')

  const body = {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'You return schema-compliant JSON only.' },
      { role: 'user', content: buildArticlePrompt(story, sourceText) },
    ],
  }

  const payload = await fetchJsonWithRetry(config.endpoint, {
    fetchImpl: (url, options) => fetchImpl(url, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
      headers: {
        ...options.headers,
        authorization: 'Bearer ' + config.apiKey,
        'content-type': 'application/json',
      },
    }),
    retries: config.requestRetries,
    timeoutMs: config.requestTimeoutMs,
    retryDelayMs,
  })

  if (payload?.error) {
    throw new Error('Weekly Day AI API error: ' + (payload.error.message ?? JSON.stringify(payload.error)))
  }

  const content = extractMessageContent(payload)
  if (!content.trim()) throw new Error('Weekly Day AI returned an empty message')
  return parseJsonResponse(content)
}
