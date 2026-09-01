const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds))

const HTML_ENTITIES = Object.freeze({
  amp: '&',
  apos: "'",
  gt: '>',
  hellip: '…',
  ldquo: '“',
  lsquo: '‘',
  lt: '<',
  mdash: '—',
  nbsp: ' ',
  ndash: '–',
  quot: '"',
  rdquo: '”',
  rsquo: '’',
})

function decodeHtmlEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity) => {
    if (entity[0] === '#') {
      const hexadecimal = entity[1]?.toLowerCase() === 'x'
      const numeric = Number.parseInt(entity.slice(hexadecimal ? 2 : 1), hexadecimal ? 16 : 10)
      if (Number.isInteger(numeric) && numeric > 0 && numeric <= 0x10ffff) {
        try {
          return String.fromCodePoint(numeric)
        } catch {
          return match
        }
      }
      return match
    }
    return HTML_ENTITIES[entity.toLowerCase()] ?? match
  })
}

export function htmlToPlainText(html, { maxCharacters = 12000 } = {}) {
  if (typeof html !== 'string' || !html.trim()) return ''

  return decodeHtmlEntities(html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template|iframe)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<(br|hr)\b[^>]*>/gi, '\n')
    .replace(/<\/(p|div|section|article|main|header|footer|aside|nav|li|h[1-6]|blockquote|pre)>/gi, '\n')
    .replace(/<[^>]+>/g, ' '))
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ *\n */g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, maxCharacters)
}

function validateSourceUrl(value) {
  const url = new URL(value)
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    throw new Error('Original article URL must use HTTP or HTTPS')
  }
  return url.toString()
}

export async function fetchOriginalArticleText(url, {
  fetchImpl = globalThis.fetch,
  retries = 2,
  timeoutMs = 15000,
  retryDelayMs = 400,
  maxCharacters = 12000,
  onWarning = console.warn,
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required')

  let normalizedUrl
  try {
    normalizedUrl = validateSourceUrl(url)
  } catch (error) {
    onWarning('Skipping original article: ' + error.message)
    return ''
  }

  let lastError
  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)

    try {
      const response = await fetchImpl(normalizedUrl, {
        headers: {
          accept: 'text/html,application/xhtml+xml,text/plain;q=0.9,*/*;q=0.1',
          'user-agent': 'AI-Daily/1.0 (+https://www.weekly-day.top/)',
        },
        redirect: 'follow',
        signal: controller.signal,
      })
      if (!response.ok) throw new Error('HTTP ' + response.status)

      const contentType = response.headers?.get?.('content-type') ?? ''
      if (contentType && !/text\/(html|plain)|application\/xhtml\+xml/i.test(contentType)) {
        throw new Error('unsupported content type ' + contentType)
      }

      return htmlToPlainText(await response.text(), { maxCharacters })
    } catch (error) {
      lastError = error
      if (attempt < retries) await sleep(retryDelayMs * (2 ** attempt))
    } finally {
      clearTimeout(timeout)
    }
  }

  onWarning('Unable to read original article ' + normalizedUrl + ': ' + (lastError?.message ?? lastError))
  return ''
}
