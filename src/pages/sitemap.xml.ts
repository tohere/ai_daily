import { allPosts } from '../data'
import { collectCategories, collectTags, encodePathSegment, locales } from '../utils/blog'

export const prerender = true

const siteUrl = import.meta.env.SITE
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

// 组内最新文章日期作为 lastmod
function latestDate(paths: Array<{ path: string; date?: string }>): string | undefined {
  return paths.map((item) => item.date).filter(Boolean).sort().at(-1)
}

export function GET(): Response {
  const entries = [
    urlEntry('/'),
    ...locales.flatMap((locale) => staticPaths.map((path) => urlEntry('/' + locale + '/' + path))),
  ]

  for (const locale of locales) {
    // 文章页
    for (const post of allPosts) {
      entries.push(urlEntry('/' + locale + '/posts/' + post.slug + '/', post.date))
    }
    // 分类筛选页
    for (const category of collectCategories(locale)) {
      const group = allPosts
        .filter((post) => post.category[locale] === category.name)
        .map((post) => ({ path: '', date: post.date }))
      entries.push(urlEntry('/' + locale + '/categories/' + encodePathSegment(category.name) + '/', latestDate(group)))
    }
    // 标签筛选页
    for (const tag of collectTags(locale)) {
      const group = allPosts
        .filter((post) => post.tags[locale].includes(tag.name))
        .map((post) => ({ path: '', date: post.date }))
      entries.push(urlEntry('/' + locale + '/tags/' + encodePathSegment(tag.name) + '/', latestDate(group)))
    }
  }

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    entries.join('\n'),
    '</urlset>',
  ].join('\n') + '\n'
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } })
}
