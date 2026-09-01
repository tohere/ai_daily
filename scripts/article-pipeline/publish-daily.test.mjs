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

const draft = {
  slug: 'useful-story',
  title: { zh: '有用的故事', en: 'A useful story' },
  excerpt: { zh: '这是摘要。', en: 'This is an excerpt.' },
  category: { zh: '技术', en: 'Technology' },
  tags: { zh: ['技术', '测试'], en: ['Technology', 'Testing'] },
  content: {
    zh: [
      { type: 'heading', text: { zh: '背景', en: 'Background' } },
      { type: 'paragraph', text: { zh: '中文内容。', en: 'Chinese content.' } },
      { type: 'paragraph', text: { zh: '更多中文内容。', en: 'More Chinese content.' } },
    ],
    en: [
      { type: 'heading', text: { zh: '背景', en: 'Background' } },
      { type: 'paragraph', text: { zh: '中文内容。', en: 'Chinese content.' } },
      { type: 'paragraph', text: { zh: '更多中文内容。', en: 'More Chinese content.' } },
    ],
  },
}

test('publishDailyArticles generates the requested count and skips published HN ids', async () => {
  const outputDirectory = await mkdtemp(path.join(os.tmpdir(), 'ai-daily-publish-'))
  const logs = []
  try {
    await writeFile(path.join(outputDirectory, 'old.json'), JSON.stringify({ source: { hnId: 103 } }))
    const fetchImpl = async (url) => {
      if (url.endsWith('/topstories.json')) return jsonResponse([101, 102, 103])
      if (url.includes('/item/')) return jsonResponse(stories.get(Number(url.match(/item\/(\d+)\.json$/)?.[1])))
      if (url.endsWith('/chat/completions')) return jsonResponse({ choices: [{ message: { content: JSON.stringify(draft) } }] })
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
    assert.ok(logs.some((message) => message.includes('selected 2 Hacker News stories')))
  } finally {
    await rm(outputDirectory, { recursive: true, force: true })
  }
})
