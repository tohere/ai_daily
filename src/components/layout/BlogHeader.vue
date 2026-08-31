<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, shallowRef } from 'vue'
import ThemeToggle from '../ui/ThemeToggle.vue'

type Locale = 'zh' | 'en'
const props = defineProps<{ locale: Locale; languagePath?: string }>()
const isMenuOpen = shallowRef(false)
const headerElement = shallowRef<HTMLElement | null>(null)
const menuButton = shallowRef<HTMLButtonElement | null>(null)
const copy = computed(() => props.locale === 'zh'
  ? { home: '首页', archives: '归档', about: '关于', language: 'English', menu: '打开菜单', closeMenu: '关闭菜单' }
  : { home: 'Home', archives: 'Archives', about: 'About', language: '中文', menu: 'Open menu', closeMenu: 'Close menu' })
const basePath = computed(() => (props.locale === 'zh' ? '/zh' : '/en'))
const languagePath = computed(() => props.languagePath ?? (props.locale === 'zh' ? '/en/' : '/zh/'))

function closeMenu() { isMenuOpen.value = false }
function toggleMenu() { isMenuOpen.value = !isMenuOpen.value }
function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape' || !isMenuOpen.value) return
  closeMenu()
  nextTick(() => menuButton.value?.focus())
}
function handleOutsideClick(event: MouseEvent) {
  if (isMenuOpen.value && !headerElement.value?.contains(event.target as Node)) closeMenu()
}

onMounted(() => {
  document.addEventListener('keydown', handleKeydown)
  document.addEventListener('click', handleOutsideClick)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKeydown)
  document.removeEventListener('click', handleOutsideClick)
})
</script>

<template>
  <header ref="headerElement" class="site-header">
    <a class="brand" :href="`${basePath}/`" @click="closeMenu">
      <span class="brand-mark" aria-hidden="true">A</span>
      <span class="brand-copy"><strong translate="no">AI Daily</strong><small>{{ props.locale === 'zh' ? '记录智能时代' : 'Notes for the intelligent age' }}</small></span>
    </a>
    <div class="header-actions">
      <nav id="site-navigation" class="site-nav" :class="{ 'is-open': isMenuOpen }" :aria-label="props.locale === 'zh' ? '主导航' : 'Main navigation'">
        <a :href="`${basePath}/`" @click="closeMenu">{{ copy.home }}</a>
        <a :href="`${basePath}/archives/`" @click="closeMenu">{{ copy.archives }}</a>
        <a :href="`${basePath}/about/`" @click="closeMenu">{{ copy.about }}</a>
        <a class="language-link" :href="languagePath" @click="closeMenu">{{ copy.language }}</a>
      </nav>
      <ThemeToggle :locale="props.locale" />
      <button ref="menuButton" class="menu-button" type="button" :aria-expanded="isMenuOpen" aria-controls="site-navigation" :aria-label="isMenuOpen ? copy.closeMenu : copy.menu" @click="toggleMenu"><span></span><span></span><span></span></button>
    </div>
  </header>
</template>

<style scoped>
.site-header { display: flex; align-items: center; justify-content: space-between; min-height: 86px; border-bottom: 1px solid var(--color-line); }
.brand { display: inline-flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
.brand-mark { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; background: var(--color-ink); color: var(--color-brand-mark); font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; }
.brand-copy { display: grid; gap: 2px; }
.brand-copy strong { font-family: var(--font-serif); font-size: 1.08rem; letter-spacing: -0.02em; }
.brand-copy small { color: var(--color-subtle); font-size: 0.68rem; letter-spacing: 0.03em; }
.header-actions { display: flex; align-items: center; gap: 10px; }
.site-nav { display: flex; align-items: center; gap: 6px; }
.site-nav a { padding: 10px 11px; border-radius: 8px; color: var(--color-muted); font-size: 0.84rem; text-decoration: none; touch-action: manipulation; transition: background-color 160ms ease, color 160ms ease; }
.site-nav a:hover { background: var(--color-accent-soft); color: var(--color-accent); }
.site-nav .language-link { margin-left: 8px; border: 1px solid var(--color-line); color: var(--color-ink); font-weight: 650; }
.menu-button { display: none; width: 44px; height: 44px; padding: 10px; border: 1px solid var(--color-line); border-radius: 10px; background: var(--color-surface); cursor: pointer; touch-action: manipulation; }
.menu-button span { display: block; height: 2px; margin: 4px 0; border-radius: 2px; background: var(--color-ink); transition: transform 160ms ease, opacity 160ms ease; }
.menu-button[aria-expanded="true"] span:nth-child(1) { transform: translateY(6px) rotate(45deg); }
.menu-button[aria-expanded="true"] span:nth-child(2) { opacity: 0; }
.menu-button[aria-expanded="true"] span:nth-child(3) { transform: translateY(-6px) rotate(-45deg); }
@media (max-width: 760px) {
  .site-header { position: relative; min-height: 72px; }
  .brand-copy small { display: none; }
  .header-actions { gap: 8px; }
  .menu-button { display: block; }
  .site-nav { position: absolute; top: calc(100% + 10px); right: 0; z-index: 20; display: none; width: min(240px, calc(100vw - 28px)); padding: 8px; border: 1px solid var(--color-line); border-radius: 12px; background: var(--color-surface-elevated); box-shadow: var(--shadow-card); }
  .site-nav.is-open { display: grid; }
  .site-nav a { min-height: 44px; padding: 11px 12px; }
  .site-nav .language-link { margin: 4px 0 0; text-align: center; }
}
@media (prefers-reduced-motion: reduce) { .menu-button span { transition: none; } }
</style>
