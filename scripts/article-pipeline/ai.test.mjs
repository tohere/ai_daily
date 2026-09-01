import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { loadAiConfig, requestArticleDraft } from './ai.mjs'
import { generateArticleDocument, writeGeneratedArticle } from './generate-article.mjs'
import { htmlToPlainText } from './source-context.mjs'
import { WEEKLY_DAY_AI } from './constants.mjs'
import { validateGeneratedDraft } from './validate-generated.mjs'

const story = {
  hnId: 12345,
  hnUrl: 'https://news.ycombinator.com/item?id=12345',
  originalUrl: 'https://example.com/story',
  title: 'A test story',
  author: 'tester',
  score: 100,
  commentCount: 20,
  publishedAt: '2026-08-31T12:00:00.000Z',
}

const longContent = {
  zh: [
    { type: 'heading', text: { zh: '背景', en: 'Background' } },
    ...Array.from({ length: 6 }, (_, index) => ({
      type: 'paragraph',
      text: {
        zh: ('这是关于人工智能系统的第' + (index + 1) + '段测试内容，介绍背景、技术机制、实际影响、局限性以及后续值得继续观察的问题。').repeat(4),
        en: ('This paragraph explains the background, technical mechanism, practical impact, limitations, and open questions of the AI system. ').repeat(12),
      },
    })),
  ],
  en: [
    { type: 'heading', text: { zh: '背景', en: 'Background' } },
    ...Array.from({ length: 6 }, (_, index) => ({
      type: 'paragraph',
      text: {
        zh: ('这是关于人工智能系统的第' + (index + 1) + '段测试内容，介绍背景、技术机制、实际影响、局限性以及后续值得继续观察的问题。').repeat(4),
        en: ('This paragraph explains the background, technical mechanism, practical impact, limitations, and open questions of the AI system. ').repeat(12),
      },
    })),
  ],
}

const draft = {
  slug: 'A useful story!',
  title: { zh: '一个有用的故事', en: 'A useful story' },
  excerpt: { zh: '这是一个测试摘要。', en: 'This is a test excerpt.' },
  category: { zh: '技术', en: 'Technology' },
  tags: { zh: ['技术', '测试'], en: ['Technology', 'Testing'] },
  content: longContent,
}

const response = (payload) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => payload,
})

const configEnv = {
  WEEKLY_DAY_AI_BASE_URL: 'https://gateway.example.com/v1///',
  WEEKLY_DAY_AI_API_KEY: 'secret-key',
  WEEKLY_DAY_AI_MODEL: 'model-x',
  WEEKLY_DAY_AI_TEMPERATURE: '0.7',
  WEEKLY_DAY_AI_MAX_TOKENS: '2000',
  WEEKLY_DAY_AI_REQUEST_TIMEOUT_MS: '5000',
  WEEKLY_DAY_AI_REQUEST_RETRIES: '1',
}

test('loadAiConfig normalizes endpoint and reads numeric options', () => {
  const config = loadAiConfig(configEnv)
  assert.equal(config.endpoint, 'https://gateway.example.com/v1/chat/completions')
  assert.equal(config.temperature, 0.7)
  assert.equal(config.maxTokens, 2000)
  assert.equal(config.requestRetries, 1)
})

test('requestArticleDraft sends an OpenAI-compatible request and parses fenced JSON', async () => {
  let requestUrl
  let requestOptions
  const fetchImpl = async (url, options) => {
    requestUrl = url
    requestOptions = options
    const newline = String.fromCharCode(10)
    const fence = String.fromCharCode(96, 96, 96)
    return response({ choices: [{ message: { content: fence + 'json' + newline + JSON.stringify(draft) + newline + fence } }] })
  }
  const config = loadAiConfig(configEnv)
  const result = await requestArticleDraft(story, '<p>source</p>', { config, fetchImpl, retryDelayMs: 0 })
  assert.equal(requestUrl, config.endpoint)
  assert.equal(requestOptions.headers.authorization, 'Bearer secret-key')
  const body = JSON.parse(requestOptions.body)
  assert.equal(body.model, 'model-x')
  assert.equal(body.response_format.type, 'json_object')
  assert.match(body.messages[1].content, /A test story/)
  assert.doesNotMatch(body.messages[1].content, /secret-key/)
  assert.equal(result.slug, draft.slug)
})

test('validateGeneratedDraft trims oversized titles and excerpts safely', () => {
  const longExcerpt = 'A detailed summary '.repeat(30)
  const normalized = validateGeneratedDraft({
    ...draft,
    title: { zh: '很长的标题'.repeat(30), en: 'A very long title '.repeat(10) },
    excerpt: { zh: '这是一段很长的摘要。'.repeat(60), en: longExcerpt },
  })
  assert.ok([...normalized.title.zh].length <= 90)
  assert.ok([...normalized.title.en].length <= 90)
  assert.ok([...normalized.excerpt.zh].length <= 220)
  assert.ok([...normalized.excerpt.en].length <= 220)
  assert.equal(normalized.excerpt.en.length <= 220, true)
})

test('requestArticleDraft rejects invalid JSON', async () => {
  const config = loadAiConfig(configEnv)
  await assert.rejects(
    requestArticleDraft(story, '', { config, fetchImpl: async () => response({ choices: [{ message: { content: 'not json' } }] }), retryDelayMs: 0 }),
    /not valid JSON/,
  )
})

test('generated document uses fixed disclosure, provider link, and HN id slug suffix', async () => {
  const config = loadAiConfig(configEnv)
  const document = await generateArticleDocument(story, {
    config,
    sourceText: 'source text',
    fetchImpl: async () => response({ choices: [{ message: { content: JSON.stringify(draft) } }] }),
    now: new Date('2026-09-01T08:00:00.000Z'),
  })
  assert.equal(document.post.slug, 'a-useful-story-hn-12345')
  assert.deepEqual(document.post.disclosure, WEEKLY_DAY_AI.disclosure)
  assert.equal(document.generation.providerUrl, 'https://www.weekly-day.top/')
  assert.equal(document.generation.provider, 'Weekly Day AI')
})

test('htmlToPlainText removes active content and decodes entities', () => {
  const result = htmlToPlainText('<style>bad</style><p>Hello &amp; world</p><script>bad()</script><p>Next</p>')
  assert.equal(result, 'Hello & world' + String.fromCharCode(10) + 'Next')
})

test('writeGeneratedArticle uses exclusive creation and refuses overwrite', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ai-daily-generated-'))
  try {
    const config = loadAiConfig(configEnv)
    const document = await generateArticleDocument(story, {
      config,
      sourceText: 'source text',
      fetchImpl: async () => response({ choices: [{ message: { content: JSON.stringify(draft) } }] }),
      now: new Date('2026-09-01T08:00:00.000Z'),
    })
    const filePath = await writeGeneratedArticle(document, directory)
    assert.equal(path.basename(filePath), '2026-09-01-hn-12345.json')
    assert.equal(JSON.parse(await readFile(filePath, 'utf8')).source.hnId, 12345)
    await assert.rejects(writeGeneratedArticle(document, directory), /already exists|EEXIST/)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
