<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

type Locale = 'zh' | 'en'
interface HeadingItem { id: string; text: string }

const props = defineProps<{ locale: Locale; items: HeadingItem[] }>()
const activeId = shallowRef(props.items[0]?.id ?? '')
const title = computed(() => props.locale === 'zh' ? '文章目录' : 'On this page')
let frameId = 0

function updateActiveHeading() {
  cancelAnimationFrame(frameId)
  frameId = requestAnimationFrame(() => {
    const headings = props.items
      .map((item) => document.getElementById(item.id))
      .filter((heading): heading is HTMLElement => heading !== null)
    const current = [...headings].reverse().find((heading) => heading.getBoundingClientRect().top <= 180)
    activeId.value = current?.id ?? headings[0]?.id ?? ''
  })
}

onMounted(() => {
  updateActiveHeading()
  window.addEventListener('scroll', updateActiveHeading, { passive: true })
  window.addEventListener('resize', updateActiveHeading)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  window.removeEventListener('scroll', updateActiveHeading)
  window.removeEventListener('resize', updateActiveHeading)
})
</script>

<template>
  <nav v-if="props.items.length" class="toc-card" :aria-label="title">
    <p class="toc-card__title">{{ title }}</p>
    <ol class="toc-card__list">
      <li v-for="item in props.items" :key="item.id">
        <a :class="{ 'is-active': activeId === item.id }" :href="`#${item.id}`" :aria-current="activeId === item.id ? 'location' : undefined">{{ item.text }}</a>
      </li>
    </ol>
  </nav>
</template>

<style scoped>
.toc-card { padding: 20px; border: 1px solid var(--color-line); border-radius: var(--radius-md); background: var(--color-surface-translucent); }
.toc-card__title { margin: 0 0 12px; color: var(--color-ink); font-size: 0.75rem; font-weight: 750; letter-spacing: 0.12em; text-transform: uppercase; }
.toc-card__list { display: grid; gap: 3px; margin: 0; padding: 0; list-style: none; }
.toc-card a { display: block; padding: 7px 0 7px 12px; border-left: 2px solid var(--color-line); color: var(--color-muted); font-size: 0.82rem; line-height: 1.5; text-decoration: none; transition: border-color 160ms ease, color 160ms ease, transform 160ms ease; }
.toc-card a:hover { color: var(--color-accent); }
.toc-card a.is-active { border-left-color: var(--color-accent); color: var(--color-accent); font-weight: 700; transform: translateX(2px); }
</style>
