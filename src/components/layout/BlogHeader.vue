<script setup lang="ts">
import { computed, shallowRef } from 'vue'

type Locale = 'zh' | 'en'
const props = defineProps<{ locale: Locale; languagePath?: string }>()
const isMenuOpen = shallowRef(false)
const copy = computed(() => props.locale === 'zh'
  ? { home: '首页', archives: '归档', about: '关于', language: 'English', menu: '打开菜单', closeMenu: '关闭菜单' }
  : { home: 'Home', archives: 'Archives', about: 'About', language: '中文', menu: 'Open menu', closeMenu: 'Close menu' })
const basePath = computed(() => (props.locale === 'zh' ? '/zh' : '/en'))
const languagePath = computed(() => props.languagePath ?? (props.locale === 'zh' ? '/en/' : '/zh/'))
function closeMenu() { isMenuOpen.value = false }
</script>

<template>
  <header class="site-header">
    <a class="brand" :href="`${basePath}/`" @click="closeMenu">
      <span class="brand-mark" aria-hidden="true">A</span>
      <span class="brand-copy"><strong>AI Daily</strong><small>{{ props.locale === 'zh' ? '记录智能时代' : 'Notes for the intelligent age' }}</small></span>
    </a>
    <button class="menu-button" type="button" :aria-expanded="isMenuOpen" aria-controls="site-navigation" :aria-label="isMenuOpen ? copy.closeMenu : copy.menu" @click="isMenuOpen = !isMenuOpen"><span></span><span></span><span></span></button>
    <nav id="site-navigation" class="site-nav" :class="{ 'is-open': isMenuOpen }" :aria-label="props.locale === 'zh' ? '主导航' : 'Main navigation'">
      <a :href="`${basePath}/`" @click="closeMenu">{{ copy.home }}</a>
      <a :href="`${basePath}/archives/`" @click="closeMenu">{{ copy.archives }}</a>
      <a :href="`${basePath}/about/`" @click="closeMenu">{{ copy.about }}</a>
      <a class="language-link" :href="languagePath" @click="closeMenu">{{ copy.language }}</a>
    </nav>
  </header>
</template>

<style scoped>
.site-header { display: flex; align-items: center; justify-content: space-between; min-height: 86px; border-bottom: 1px solid var(--color-line); }
.brand { display: inline-flex; align-items: center; gap: 12px; color: inherit; text-decoration: none; }
.brand-mark { display: grid; width: 38px; height: 38px; place-items: center; border-radius: 12px; background: var(--color-ink); color: white; font-family: var(--font-serif); font-size: 1.15rem; font-weight: 700; }
.brand-copy { display: grid; gap: 2px; }
.brand-copy strong { font-family: var(--font-serif); font-size: 1.08rem; letter-spacing: -0.02em; }
.brand-copy small { color: var(--color-subtle); font-size: 0.68rem; letter-spacing: 0.03em; }
.site-nav { display: flex; align-items: center; gap: 6px; }
.site-nav a { padding: 9px 11px; border-radius: 8px; color: var(--color-muted); font-size: 0.84rem; text-decoration: none; transition: background-color 160ms ease, color 160ms ease; }
.site-nav a:hover { background: var(--color-accent-soft); color: var(--color-accent); }
.site-nav .language-link { margin-left: 8px; border: 1px solid var(--color-line); color: var(--color-ink); font-weight: 650; }
.menu-button { display: none; width: 40px; height: 40px; padding: 9px; border: 1px solid var(--color-line); border-radius: 10px; background: var(--color-surface); cursor: pointer; }
.menu-button span { display: block; height: 2px; margin: 4px 0; border-radius: 2px; background: var(--color-ink); }
@media (max-width: 760px) {
  .site-header { position: relative; min-height: 72px; }
  .menu-button { display: block; }
  .site-nav { position: absolute; top: calc(100% + 10px); right: 0; z-index: 10; display: none; width: min(220px, 100%); padding: 8px; border: 1px solid var(--color-line); border-radius: 12px; background: rgba(255, 255, 255, 0.96); box-shadow: var(--shadow-card); }
  .site-nav.is-open { display: grid; }
  .site-nav a { padding: 11px 12px; }
  .site-nav .language-link { margin: 4px 0 0; text-align: center; }
}
</style>
