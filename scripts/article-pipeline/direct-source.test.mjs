import assert from 'node:assert/strict'
import test from 'node:test'
import { parseUrlList, selectStoriesFromUrls } from './direct-source.mjs'
import { WEEKLY_DAY_AI } from './constants.mjs'
import { createGeneratedArticleDocument } from './validate-generated.mjs'
import { urlHashHex } from './url-hash.mjs'

const now = new Date('2026-09-01T08:00:00.000Z')

test('parseUrlList splits on whitespace and commas and removes duplicates', () => {
  assert.deepEqual(
    parseUrlList('https://a.example.com/x, https://b.example.com/y\nhttps://a.example.com/x'),
    ['https://a.example.com/x', 'https://b.example.com/y'],
  )
  assert.deepEqual(parseUrlList('   '), [])
  assert.deepEqual(parseUrlList(undefined), [])
})

test('selectStoriesFromUrls fetches each URL once and builds web stories', async () => {
  const pages = new Map([
    ['https://source.example.com/one', '<html><head><meta property="og:title" content="First &amp; Story"><body><p>First article body text.</p></body></html>'],
  ])
  const requested = []
  const fetchImpl = async (url) => {
    requested.push(url)
    const html = pages.get(url)
    if (!html) throw new Error('404')
    return { ok: true, status: 200, text: async () => html }
  }

  const { selected } = await selectStoriesFromUrls({
    urls: ['https://source.example.com/one'],
    fetchImpl,
    now,
    onWarning: () => {},
  })

  assert.equal(requested.length, 1)
  assert.equal(selected.length, 1)
  assert.equal(selected[0].hnId, null)
  assert.equal(selected[0].hnUrl, null)
  assert.equal(selected[0].title, 'First & Story')
  assert.equal(selected[0].author, 'source.example.com')
  assert.equal(selected[0].sourceText.includes('First article body text.'), true)
})

test('selectStoriesFromUrls skips invalid URLs and fails when no content is readable', async () => {
  const warnings = []
  await assert.rejects(
    selectStoriesFromUrls({
      urls: ['ftp://bad.example.com/x'],
      fetchImpl: async () => { throw new Error('should not be called') },
      now,
      onWarning: (message) => warnings.push(message),
    }),
    /No valid article URLs/,
  )

  await assert.rejects(
    selectStoriesFromUrls({
      urls: ['https://empty.example.com/blank'],
      fetchImpl: async () => ({ ok: true, status: 200, text: async () => '<html><head></head><body><p></p></body></html>' }),
      now,
      onWarning: () => {},
    }),
    /Unable to read usable content/,
  )
})

test('createGeneratedArticleDocument builds web slugs and web disclosure without an HN source', () => {
  const originalUrl = 'https://source.example.com/one'
  const document = createGeneratedArticleDocument(
    {
      hnId: null,
      hnUrl: null,
      originalUrl,
      title: 'First Story',
      author: 'source.example.com',
      score: 0,
      commentCount: 0,
      publishedAt: now.toISOString(),
    },
    {
      slug: 'first-story',
      title: { zh: '第一个故事', en: 'First story' },
      excerpt: { zh: '这是摘要。', en: 'This is an excerpt.' },
      category: { zh: '技术', en: 'Technology' },
      tags: { zh: ['技术'], en: ['Technology'] },
      content: {
        zh: [
          { type: 'heading', text: { zh: '背景', en: 'Background' } },
          ...Array.from({ length: 6 }, (_, index) => ({
            type: 'paragraph',
            text: {
              zh: ('这是关于人工智能系统的第' + (index + 1) + '段测试内容，介绍背景、技术机制、实际影响、局限性以及后续值得继续观察的问题。').repeat(4),
              en: 'This paragraph explains the background, technical mechanism, practical impact, limitations, and open questions of the AI system. '.repeat(12),
            },
          })),
        ],
        en: [
          { type: 'heading', text: { zh: '背景', en: 'Background' } },
          ...Array.from({ length: 6 }, (_, index) => ({
            type: 'paragraph',
            text: {
              zh: ('这是关于人工智能系统的第' + (index + 1) + '段测试内容，介绍背景、技术机制、实际影响、局限性以及后续值得继续观察的问题。').repeat(4),
              en: 'This paragraph explains the background, technical mechanism, practical impact, limitations, and open questions of the AI system. '.repeat(12),
            },
          })),
        ],
      },
    },
    { model: 'model-x', generatedAt: now.toISOString() },
  )

  assert.equal(document.source.hnId, null)
  assert.equal(document.source.hnUrl, null)
  assert.equal(document.post.slug, 'first-story-web-' + urlHashHex(originalUrl))
  assert.deepEqual(document.post.disclosure, WEEKLY_DAY_AI.disclosureWeb)
})
