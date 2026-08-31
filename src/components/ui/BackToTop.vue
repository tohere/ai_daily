<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, shallowRef } from 'vue'

type Locale = 'zh' | 'en'
const props = defineProps<{ locale: Locale }>()
const isVisible = shallowRef(false)
const label = computed(() => props.locale === 'zh' ? '返回顶部' : 'Back to top')
let frameId = 0

function updateVisibility() {
  cancelAnimationFrame(frameId)
  frameId = requestAnimationFrame(() => { isVisible.value = window.scrollY > 600 })
}

function backToTop() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' })
}

onMounted(() => {
  updateVisibility()
  window.addEventListener('scroll', updateVisibility, { passive: true })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  window.removeEventListener('scroll', updateVisibility)
})
</script>

<template>
  <Transition name="back-to-top">
    <button v-if="isVisible" class="back-to-top" type="button" :aria-label="label" :title="label" @click="backToTop">
      <svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 14 6-6 6 6" /><path d="M12 8v10" /></svg>
    </button>
  </Transition>
</template>

<style scoped>
.back-to-top { position: fixed; right: max(20px, env(safe-area-inset-right)); bottom: max(20px, env(safe-area-inset-bottom)); z-index: 30; display: grid; width: 46px; height: 46px; place-items: center; padding: 0; border: 1px solid var(--color-line); border-radius: 50%; background: var(--color-surface); color: var(--color-accent); box-shadow: var(--shadow-card); cursor: pointer; touch-action: manipulation; transition: border-color 160ms ease, background-color 160ms ease, transform 160ms ease; }
.back-to-top:hover { border-color: var(--color-accent); background: var(--color-accent-soft); transform: translateY(-2px); }
.back-to-top svg { width: 20px; height: 20px; fill: none; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 2; }
.back-to-top-enter-active, .back-to-top-leave-active { transition: opacity 160ms ease, transform 160ms ease; }
.back-to-top-enter-from, .back-to-top-leave-to { opacity: 0; transform: translateY(8px); }
@media (max-width: 520px) { .back-to-top { right: max(14px, env(safe-area-inset-right)); bottom: max(14px, env(safe-area-inset-bottom)); } }
@media (prefers-reduced-motion: reduce) { .back-to-top, .back-to-top-enter-active, .back-to-top-leave-active { transition: none; } }
</style>
