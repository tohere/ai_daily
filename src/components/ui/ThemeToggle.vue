<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'

type Locale = 'zh' | 'en'
type Theme = 'light' | 'dark'

const props = defineProps<{ locale: Locale }>()
const theme = shallowRef<Theme>('light')

const label = computed(() => {
  if (props.locale === 'zh') return theme.value === 'dark' ? '切换到浅色模式' : '切换到深色模式'
  return theme.value === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'
})

function applyTheme(nextTheme: Theme, persist = true) {
  theme.value = nextTheme
  document.documentElement.dataset.theme = nextTheme
  document.documentElement.style.colorScheme = nextTheme
  document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    ?.setAttribute('content', nextTheme === 'dark' ? '#171b20' : '#f7f9fb')
  if (persist) {
    try { localStorage.setItem('ai-daily-theme', nextTheme) } catch { /* Theme still applies when storage is unavailable. */ }
  }
}

function toggleTheme() {
  applyTheme(theme.value === 'dark' ? 'light' : 'dark')
}

onMounted(() => {
  const currentTheme = document.documentElement.dataset.theme
  applyTheme(currentTheme === 'dark' ? 'dark' : 'light', false)
})
</script>

<template>
  <button class="theme-toggle" type="button" :aria-label="label" :title="label" @click="toggleTheme">
    <svg v-if="theme === 'dark'" aria-hidden="true" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41" />
    </svg>
    <svg v-else aria-hidden="true" viewBox="0 0 24 24">
      <path d="M20.5 14.4A8 8 0 0 1 9.6 3.5 8.5 8.5 0 1 0 20.5 14.4Z" />
    </svg>
    <span class="theme-toggle__text">{{ theme === 'dark' ? (props.locale === 'zh' ? '浅色' : 'Light') : (props.locale === 'zh' ? '深色' : 'Dark') }}</span>
  </button>
</template>

<style scoped>
.theme-toggle {
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid var(--color-line);
  border-radius: 10px;
  background: var(--color-surface);
  color: var(--color-muted);
  font: inherit;
  font-size: 0.76rem;
  font-weight: 650;
  cursor: pointer;
  touch-action: manipulation;
  transition: border-color 160ms ease, background-color 160ms ease, color 160ms ease;
}
.theme-toggle:hover { border-color: var(--color-accent); background: var(--color-accent-soft); color: var(--color-accent); }
.theme-toggle svg { width: 17px; height: 17px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.8; }
@media (max-width: 520px) { .theme-toggle { width: 44px; padding: 0; } .theme-toggle__text { position: absolute; width: 1px; height: 1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; } }
</style>
