import assert from 'node:assert/strict'
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import { loadPublishedHnIds } from './generated-posts.mjs'
import { fetchJsonWithRetry, normalizeHackerNewsStory, selectHackerNewsStories } from './hacker-news.mjs'

function response(json, { ok = true, status = 200 } = {}) {
  return { ok, status, json: async () => json }
}

test('normalizeHackerNewsStory accepts external stories and rejects invalid items', () => {
  const normalized = normalizeHackerNewsStory({
    id: 101, type: 'story', url: 'https://example.com/post', title: ' Example ', by: 'alice',
    time: 1_700_000_000, score: 42, descendants: 7,
  })
  assert.equal(normalized.hnId, 101)
  assert.equal(normalized.originalUrl, 'https://example.com/post')
  assert.equal(normalizeHackerNewsStory({ id: 102, type: 'story', url: 'https://news.ycombinator.com/item?id=102', title: 'Ask', by: 'bob', time: 1_700_000_000 }), null)
  assert.equal(normalizeHackerNewsStory({ id: 103, type: 'comment' }), null)
})

test('fetchJsonWithRetry retries a temporary failure', async () => {
  let attempts = 0
  const fetchImpl = async () => {
    attempts += 1
    if (attempts === 1) throw new Error('temporary')
    return response({ ok: true })
  }
  const result = await fetchJsonWithRetry('https://example.com/data.json', { fetchImpl, retries: 1, retryDelayMs: 0 })
  assert.deepEqual(result, { ok: true })
  assert.equal(attempts, 2)
})

test('selectHackerNewsStories filters thresholds and published ids, then ranks candidates', async () => {
  const items = new Map([
    [1, { id: 1, type: 'story', url: 'https://one.example/', title: 'One', by: 'a', time: 1_700_000_000, score: 100, descendants: 30 }],
    [2, { id: 2, type: 'story', url: 'https://two.example/', title: 'Two', by: 'b', time: 1_700_000_100, score: 90, descendants: 50 }],
    [3, { id: 3, type: 'story', url: 'https://three.example/', title: 'Three', by: 'c', time: 1_700_000_200, score: 200, descendants: 80 }],
    [4, { id: 4, type: 'story', url: 'https://four.example/', title: 'Four', by: 'd', time: 1_700_000_300, score: 10, descendants: 2 }],
  ])
  const fetchImpl = async (url) => {
    if (url.endsWith('/topstories.json')) return response([1, 2, 3, 4])
    const id = Number(url.match(/\/item\/(\d+)\.json$/)?.[1])
    return response(items.get(id))
  }

  const result = await selectHackerNewsStories({
    count: 2, fetchLimit: 4, minScore: 50, minComments: 10, fetchImpl, requestRetries: 0,
    publishedHnIds: new Set([3]), now: new Date(1_700_001_000 * 1000), onWarning: () => {},
  })
  assert.deepEqual(result.selected.map((story) => story.hnId), [2, 1])
  assert.equal(result.stats.eligible, 2)
  assert.equal(result.stats.publishedIds, 1)
})

test('loadPublishedHnIds reads valid generated files and skips malformed files', async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'ai-daily-hn-'))
  const warnings = []
  try {
    await writeFile(path.join(directory, 'valid.json'), JSON.stringify({ source: { hnId: 123 } }))
    await writeFile(path.join(directory, 'invalid.json'), '{not-json')
    const ids = await loadPublishedHnIds(directory, { onWarning: (message) => warnings.push(message) })
    assert.deepEqual([...ids], [123])
    assert.equal(warnings.length, 1)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
})
