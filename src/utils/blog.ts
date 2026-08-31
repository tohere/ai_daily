import { posts } from '../data/posts'
import type { Locale, Post } from '../data/posts'

export interface PostHeading {
  id: string
  text: string
}

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

export function getPostHeadings(post: Post, locale: Locale): PostHeading[] {
  const usedIds = new Map<string, number>()
  return post.content[locale]
    .filter((block) => block.type === 'heading')
    .map((block, index) => {
      const text = block.type === 'heading' ? block.text[locale] : ''
      const baseId = text
        .normalize('NFKC')
        .toLocaleLowerCase(locale === 'zh' ? 'zh-CN' : 'en-US')
        .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
        .replace(/^-+|-+$/g, '') || `section-${index + 1}`
      const count = usedIds.get(baseId) ?? 0
      usedIds.set(baseId, count + 1)
      return { id: count === 0 ? baseId : `${baseId}-${count + 1}`, text }
    })
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
