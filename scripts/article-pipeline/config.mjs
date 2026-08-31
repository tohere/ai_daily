function readInteger(env, name, fallback, { min = 0, max = Number.MAX_SAFE_INTEGER } = {}) {
  const raw = env[name]
  if (raw === undefined || raw === '') return fallback
  const value = Number.parseInt(raw, 10)
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(`${name} must be an integer between ${min} and ${max}; received ${raw}`)
  }
  return value
}

export function loadHackerNewsConfig(env = process.env) {
  const dailyArticleCount = readInteger(env, 'DAILY_ARTICLE_COUNT', 2, { min: 1, max: 10 })
  const fetchLimit = readInteger(env, 'HN_FETCH_LIMIT', 50, { min: dailyArticleCount, max: 500 })

  return Object.freeze({
    dailyArticleCount,
    fetchLimit,
    minScore: readInteger(env, 'HN_MIN_SCORE', 50, { min: 0, max: 100000 }),
    minComments: readInteger(env, 'HN_MIN_COMMENTS', 10, { min: 0, max: 100000 }),
    fetchConcurrency: readInteger(env, 'HN_FETCH_CONCURRENCY', 8, { min: 1, max: 30 }),
    requestTimeoutMs: readInteger(env, 'HN_REQUEST_TIMEOUT_MS', 12000, { min: 1000, max: 60000 }),
    requestRetries: readInteger(env, 'HN_REQUEST_RETRIES', 3, { min: 0, max: 8 }),
  })
}
