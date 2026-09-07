import assert from 'node:assert/strict'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { publishDailyArticles } from './publish-daily.mjs'
import { WEEKLY_DAY_AI } from './constants.mjs'

const now = new Date('2026-09-01T08:15:00.000Z')
const env = {
  DAILY_ARTICLE_COUNT: '2',
  HN_FETCH_LIMIT: '3',
  HN_MIN_SCORE: '50',
  HN_MIN_COMMENTS: '10',
  HN_FETCH_CONCURRENCY: '2',
  HN_REQUEST_RETRIES: '0',
  WEEKLY_DAY_AI_BASE_URL: 'https://gateway.example.com/v1',
  WEEKLY_DAY_AI_API_KEY: 'test-key',
  WEEKLY_DAY_AI_MODEL: 'model-x',
  WEEKLY_DAY_AI_REQUEST_RETRIES: '0',
}

const stories = new Map([
  [101, { id: 101, type: 'story', url: 'https://example.com/ai-one', title: 'One useful AI story', by: 'alice', time: 1_756_700_000, score: 100, descendants: 30 }],
  [102, { id: 102, type: 'story', url: 'https://example.com/llm-two', title: 'Two useful language model stories', by: 'bob', time: 1_756_700_100, score: 120, descendants: 40 }],
  [103, { id: 103, type: 'story', url: 'https://example.com/openai-three', title: 'Already published OpenAI story', by: 'carol', time: 1_756_700_200, score: 200, descendants: 80 }],
])

function jsonResponse(payload) {
  return { ok: true, status: 200, json: async () => payload }
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
  slug: 'useful-story',
  title: { zh: '有用的故事', en: 'A useful story' },
  excerpt: { zh: '这是摘要。', en: 'This is an excerpt.' },
  category: { zh: '技术', en: 'Technology' },
  tags: { zh: ['技术', '测试'], en: ['Technology', 'Testing'] },
  content: longContent,
}

test('publishDailyArticles generates the requested count and skips published HN ids', async () => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'ai-daily-publish-'))
  const logs = []
  try {
    await writeFile(path.join(outputDirectory, 'old.json'), JSON.stringify({ source: { hnId: 103 } }))
    const fetchImpl = async (url) => {
      if (url.endsWith('/topstories.json')) return jsonResponse([101, 102, 103])
      if (url.includes('/item/')) return jsonResponse(stories.get(Number(url.match(/item\/(\d+)\.json$/)?.[1])))
      if (url.endsWith('/responses')) return jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(draft) }] }] })
      throw new Error('Unexpected request: ' + url)
    }
    const sourceFetchImpl = async () => ({ ok: true, status: 200, text: async () => '<p>Source article text.</p>' })

    const result = await publishDailyArticles({ env, now, outputDirectory, fetchImpl, sourceFetchImpl, onLog: (message) => logs.push(message), onWarning: () => {} })

    assert.deepEqual(result.selection.selected.map((story) => story.hnId), [102, 101])
    assert.equal(result.documents.length, 2)
    assert.equal(result.writtenFiles.length, 2)
    assert.deepEqual((await readdir(outputDirectory)).sort(), ['2026-09-01-hn-101.json', '2026-09-01-hn-102.json', 'old.json'])
    const document = JSON.parse(await readFile(result.writtenFiles[0], 'utf8'))
    assert.deepEqual(document.post.disclosure, WEEKLY_DAY_AI.disclosure)
    assert.equal(document.generation.providerUrl, WEEKLY_DAY_AI.url)
    assert.ok(logs.some((message) => message.includes('mode: Hacker News front page')))
    assert.ok(logs.some((message) => message.includes('selected 2 story(ies)')))
  } finally {
    await rm(outputDirectory, { recursive: true, force: true })
  }
})

test('publishDailyArticles reads direct URLs when ARTICLE_URLS is set', async () => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'ai-daily-publish-urls-'))
  const logs = []
  try {
    const urlEnv = { ...env, ARTICLE_URLS: 'https://source.example.com/post-one  ,  https://source.example.com/post-one' }
    const aiCalls = []
    const fetchImpl = async (url) => {
      if (url.endsWith('/responses')) {
        aiCalls.push(url)
        return jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(draft) }] }] })
      }
      throw new Error('Unexpected AI request: ' + url)
    }
    const sourceFetchImpl = async () => ({
      ok: true,
      status: 200,
      text: async () => '<html><head><title>Direct Source Story</title></head><body><p>Direct source article body text for testing.</p></body></html>',
    })

    const result = await publishDailyArticles({ env: urlEnv, now, outputDirectory, fetchImpl, sourceFetchImpl, onLog: (message) => logs.push(message), onWarning: () => {} })

    assert.ok(logs.some((message) => message.includes('mode: direct URLs (1 link(s))')))
    assert.equal(result.documents.length, 1)
    assert.equal(aiCalls.length, 1)
    assert.equal(result.documents[0].source.hnId, null)
    assert.equal(result.documents[0].source.title, 'Direct Source Story')
    assert.deepEqual(result.documents[0].post.disclosure, WEEKLY_DAY_AI.disclosureWeb)
    assert.match(result.documents[0].post.slug, /-web-[0-9a-f]{8}$/)
    const writtenName = path.basename(result.writtenFiles[0])
    assert.match(writtenName, /^2026-09-01-web-[0-9a-f]{8}\.json$/)
  } finally {
    await rm(outputDirectory, { recursive: true, force: true })
  }
})

test('publishDailyArticles searches HN Algolia when ARTICLE_TOPIC is set', async () => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'ai-daily-publish-topic-'))
  const logs = []
  try {
    await writeFile(path.join(outputDirectory, 'old.json'), JSON.stringify({ source: { hnId: 201, originalUrl: 'https://example.com/published' } }))
    const topicEnv = { ...env, ARTICLE_TOPIC: 'vector database' }
    const fetchImpl = async (url) => {
      if (url.startsWith('https://hn.algolia.com/api/v1/search')) {
        assert.ok(url.includes('query=vector%20database'))
        return jsonResponse({
          hits: [
            { objectID: '201', url: 'https://example.com/published', title: 'Published result', author: 'dana', points: 80, num_comments: 20, created_at: '2026-08-30T10:00:00Z' },
            { objectID: '202', url: 'https://example.com/vector-db', title: 'Vector database results', author: 'erin', points: 60, num_comments: 15, created_at: '2026-08-31T10:00:00Z' },
            { objectID: '203', url: null, title: 'Ask HN: no link here', author: 'frank', points: 30, num_comments: 5, created_at: '2026-08-31T11:00:00Z' },
            { objectID: '204', url: 'https://example.com/embeddings', title: 'Embeddings story', author: 'grace', points: 40, num_comments: 8, created_at: '2026-08-31T12:00:00Z' },
          ],
        })
      }
      if (url.includes('/item/')) return jsonResponse(stories.get(Number(url.match(/item\/(\d+)\.json$/)?.[1])) ?? { id: 1, type: 'story', url: 'https://example.com/x', title: 'x', by: 'y', time: 1_756_700_000, score: 1, descendants: 1 })
      if (url.endsWith('/responses')) return jsonResponse({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(draft) }] }] })
      throw new Error('Unexpected request: ' + url)
    }
    const sourceFetchImpl = async () => ({ ok: true, status: 200, text: async () => '<p>Source article text.</p>' })

    const result = await publishDailyArticles({ env: topicEnv, now, outputDirectory, fetchImpl, sourceFetchImpl, onLog: (message) => logs.push(message), onWarning: () => {} })

    assert.ok(logs.some((message) => message.includes('mode: topic search "vector database"')))
    assert.deepEqual(result.selection.selected.map((story) => story.hnId), [202, 204])
    assert.equal(result.documents.length, 2)
    assert.deepEqual(result.documents[0].post.disclosure, WEEKLY_DAY_AI.disclosure)
  } finally {
    await rm(outputDirectory, { recursive: true, force: true })
  }
})
