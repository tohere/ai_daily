<script setup lang="ts">
import { onBeforeUnmount, onMounted, shallowRef } from 'vue'

const progress = shallowRef(0)
let frameId = 0

function updateProgress() {
  cancelAnimationFrame(frameId)
  frameId = requestAnimationFrame(() => {
    const article = document.querySelector<HTMLElement>('.post-article')
    if (!article) return
    const start = article.getBoundingClientRect().top + window.scrollY
    const distance = Math.max(article.offsetHeight - window.innerHeight, 1)
    progress.value = Math.min(1, Math.max(0, (window.scrollY - start) / distance))
  })
}

onMounted(() => {
  updateProgress()
  window.addEventListener('scroll', updateProgress, { passive: true })
  window.addEventListener('resize', updateProgress)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frameId)
  window.removeEventListener('scroll', updateProgress)
  window.removeEventListener('resize', updateProgress)
})
</script>

<template>
  <div class="reading-progress" aria-hidden="true">
    <span :style="{ transform: `scaleX(${progress})` }"></span>
  </div>
</template>

<style scoped>
.reading-progress { position: fixed; inset: 0 0 auto; z-index: 100; height: 3px; pointer-events: none; }
.reading-progress span { display: block; width: 100%; height: 100%; background: var(--color-accent); box-shadow: 0 0 12px var(--color-accent); transform: scaleX(0); transform-origin: left center; }
</style>
