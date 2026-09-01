import { allPosts } from '../data'

export const prerender = true

const siteUrl = 'https://www.weekly-day.top'
const locales = ['zh', 'en'] as const
const staticPaths = ['', 'about/', 'archives/', 'categories/', 'tags/']

function escapeXml(value: string): string {
  return value.replace(/[<>&'"]/g, (character) => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  })[character] ?? character)
}

function urlEntry(path: string, lastmod?: string): string {
  return [
    '  <url>',
    '    <loc>' + escapeXml(siteUrl + path) + '</loc>',
    lastmod ? '    <lastmod>' + escapeXml(lastmod) + '</lastmod>' : '',
    '  </url>',
  ].filter(Boolean).join('\n')
}

export function GET(): Response {
  const entries = [
    urlEntry('/'),
    ...locales.flatMap((locale) => staticPaths.map((path) => urlEntry('/' + locale + '/' + path))),
    ...locales.flatMap((locale) => allPosts.map((post) => urlEntry('/' + locale + '/posts/' + post.slug + '/', post.date))),
  ]
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join('\n'),
    '</urlset>',
  ].join('\n') + '\n'
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
