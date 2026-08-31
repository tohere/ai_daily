import { posts } from '../data/posts'
import type { Locale, Post } from '../data/posts'

export const locales: Locale[] = ['zh', 'en']

export function isLocale(value: string | undefined): value is Locale {
  return value === 'zh' || value === 'en'
}

export function getLocale(value: string | undefined): Locale {
  return isLocale(value) ? value : 'zh'
}

export function getLocalizedPath(locale: Locale, pathname: string): string {
  const suffix = pathname.replace(/^\/(zh|en)(?=\/|$)/, '') || '/'
  return '/' + locale + (suffix === '/' ? '/' : suffix)
}

export function formatDate(date: string, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  }).format(new Date(date + 'T12:00:00'))
}

export function sortPosts(items: Post[]): Post[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date))
}

export function findPost(slug: string | undefined): Post | undefined {
  return posts.find((post) => post.slug === slug)
}

export function collectCategories(locale: Locale): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const post of posts) counts.set(post.category[locale], (counts.get(post.category[locale]) ?? 0) + 1)
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
}

export function collectTags(locale: Locale): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const post of posts) for (const tag of post.tags[locale]) counts.set(tag, (counts.get(tag) ?? 0) + 1)
  return [...counts.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => a.name.localeCompare(b.name))
}
