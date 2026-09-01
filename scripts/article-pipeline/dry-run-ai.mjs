import { generateArticleDocument } from './generate-article.mjs'

const story = {
  hnId: 49500001,
  hnUrl: 'https://news.ycombinator.com/item?id=49500001',
  originalUrl: 'https://example.com/ai-workflow',
  title: 'A practical guide to reliable AI workflows',
  author: 'demo-author',
  score: 186,
  commentCount: 42,
  publishedAt: '2026-08-31T12:00:00.000Z',
}

const draft = {
  slug: 'reliable-ai-workflows',
  title: { zh: '构建可靠 AI 工作流的实用方法', en: 'Practical ways to build reliable AI workflows' },
  excerpt: { zh: '从输入整理、事实边界和人工复核三个方面，理解如何让 AI 工作流更可靠。', en: 'How organized inputs, factual boundaries, and human review make AI workflows more reliable.' },
  category: { zh: '人工智能', en: 'Artificial Intelligence' },
  tags: { zh: ['AI', '工作流', '可靠性'], en: ['AI', 'Workflow', 'Reliability'] },
  content: {
    zh: [
      { type: 'heading', text: { zh: '为什么可靠性比速度更重要', en: 'Why reliability matters more than speed' } },
      { type: 'paragraph', text: { zh: 'AI 可以快速生成内容，但速度不能代替事实核验和清晰的边界。', en: 'AI can generate content quickly, but speed cannot replace fact checking and clear boundaries.' } },
      { type: 'heading', text: { zh: '先整理输入和约束', en: 'Organize inputs and constraints first' } },
      { type: 'paragraph', text: { zh: '明确来源、目标与限制，可以减少模型补全未知信息的空间。', en: 'Clear sources, goals, and constraints reduce the space in which a model may fill in unknown information.' } },
      { type: 'paragraph', text: { zh: '当原文不可用时，应降低结论强度，并把不确定性告诉读者。', en: 'When the source is unavailable, claims should be weaker and uncertainty should be visible to readers.' } },
    ],
    en: [
      { type: 'heading', text: { zh: '为什么可靠性比速度更重要', en: 'Why reliability matters more than speed' } },
      { type: 'paragraph', text: { zh: 'AI 可以快速生成内容，但速度不能代替事实核验和清晰的边界。', en: 'AI can generate content quickly, but speed cannot replace fact checking and clear boundaries.' } },
      { type: 'heading', text: { zh: '先整理输入和约束', en: 'Organize inputs and constraints first' } },
      { type: 'paragraph', text: { zh: '明确来源、目标与限制，可以减少模型补全未知信息的空间。', en: 'Clear sources, goals, and constraints reduce the space in which a model may fill in unknown information.' } },
      { type: 'paragraph', text: { zh: '当原文不可用时，应降低结论强度，并把不确定性告诉读者。', en: 'When the source is unavailable, claims should be weaker and uncertainty should be visible to readers.' } },
    ],
  },
}

const config = {
  endpoint: 'https://gateway.example.com/v1/chat/completions',
  apiKey: 'dry-run-key',
  model: 'dry-run-model',
  temperature: 0.4,
  maxTokens: 5000,
  requestTimeoutMs: 5000,
  requestRetries: 0,
}

const jsonResponse = (payload) => ({
  ok: true,
  status: 200,
  headers: { get: () => 'application/json' },
  json: async () => payload,
})

const fetchImpl = async (url, options) => {
  if (url !== config.endpoint) throw new Error('Unexpected dry-run URL: ' + url)
  const request = JSON.parse(options.body)
  if (request.model !== config.model || !request.response_format) throw new Error('Dry-run request body is invalid')
  return jsonResponse({ choices: [{ message: { content: JSON.stringify(draft) } }] })
}

const sourceFetchImpl = async () => ({
  ok: true,
  status: 200,
  headers: { get: () => 'text/html; charset=utf-8' },
  text: async () => '<html><head><style>hidden</style></head><body><h1>Source</h1><p>Reliable AI needs explicit constraints.</p><script>alert(1)</script></body></html>',
})

const document = await generateArticleDocument(story, {
  config,
  fetchImpl,
  sourceFetchImpl,
  now: new Date('2026-09-01T00:00:00.000Z'),
  sourceOptions: { retries: 0 },
  aiOptions: { retryDelayMs: 0 },
})

console.log(JSON.stringify(document, null, 2))
