<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { safeSegment } from "../../utils/blog";

type Locale = "zh" | "en";
interface TaxonomyItem {
  name: string;
  count: number;
}
const props = defineProps<{
  locale: Locale;
  categories: TaxonomyItem[];
  tags: TaxonomyItem[];
}>();
const basePath = computed(() => (props.locale === "zh" ? "/zh" : "/en"));
const copy = computed(() =>
  props.locale === "zh"
    ? {
        profile: "关于本站",
        profileText: "一个由 AI 自动生成 Hacker News 双语文章的资讯博客。",
        categories: "分类",
        tags: "常用标签",
      }
    : {
        profile: "About this site",
        profileText:
          "A bilingual news blog that uses AI to generate articles from Hacker News.",
        categories: "Categories",
        tags: "Popular tags",
      },
);
const showAllCategories = shallowRef(false);
const visibleCategories = computed(() =>
  showAllCategories.value ? props.categories : props.categories.slice(0, 6),
);
const hasMoreCategories = computed(() => props.categories.length > 6);
const categoryToggleLabel = computed(() =>
  showAllCategories.value
    ? props.locale === "zh"
      ? "收起分类"
      : "Show fewer categories"
    : props.locale === "zh"
      ? "更多分类"
      : "More categories",
);
const toggleCategories = () => {
  showAllCategories.value = !showAllCategories.value;
};
const categoryHref = (name: string) =>
  `${basePath.value}/categories/${safeSegment(name)}/`;
const tagHref = (name: string) =>
  `${basePath.value}/tags/${safeSegment(name)}/`;
</script>

<template>
  <aside class="left-sidebar" :aria-label="copy.profile">
    <div class="profile-card">
      <div class="profile-avatar" aria-hidden="true">AI</div>
      <h2 class="profile-name">AI Daily</h2>
      <p class="profile-text">{{ copy.profileText }}</p>
    </div>
    <section class="sidebar-section">
      <h3>{{ copy.categories }}</h3>
      <ul id="sidebar-categories-list">
        <li v-for="item in visibleCategories" :key="item.name">
          <a :href="categoryHref(item.name)">{{ item.name }}</a>
        </li>
      </ul>
      <button
        v-if="hasMoreCategories"
        class="sidebar-more-button"
        type="button"
        aria-controls="sidebar-categories-list"
        :aria-expanded="showAllCategories"
        @click="toggleCategories"
      >
        {{ categoryToggleLabel }}
      </button>
    </section>
    <section class="sidebar-section">
      <h3>{{ copy.tags }}</h3>
      <div class="tag-list">
        <a v-for="item in tags" :key="item.name" :href="tagHref(item.name)"
          >#{{ item.name }}</a
        >
      </div>
    </section>
  </aside>
</template>

<style scoped>
.left-sidebar {
  color: var(--color-muted);
}
.profile-card {
  padding-bottom: 28px;
  border-bottom: 1px solid var(--color-line);
}
.profile-avatar {
  display: grid;
  width: 58px;
  height: 58px;
  place-items: center;
  margin-bottom: 16px;
  border: 1px solid rgba(79, 124, 172, 0.24);
  border-radius: 18px;
  background: var(--color-accent-soft);
  color: var(--color-accent);
  font-size: 0.84rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}
.profile-name {
  margin: 0;
  color: var(--color-ink);
  font-family: var(--font-serif);
  font-size: 1.12rem;
}
.profile-text {
  margin: 10px 0 0;
  font-size: 0.82rem;
  line-height: 1.75;
}
.sidebar-section {
  padding-top: 26px;
}
.sidebar-section h3 {
  margin: 0 0 12px;
  color: var(--color-ink);
  font-size: 0.72rem;
  letter-spacing: 0.11em;
  text-transform: uppercase;
}
.sidebar-section ul {
  display: grid;
  gap: 9px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.sidebar-section a {
  color: var(--color-muted);
  font-size: 0.82rem;
  text-decoration: none;
  transition: color 160ms ease;
}
.sidebar-section a:hover {
  color: var(--color-accent);
}
.sidebar-more-button {
  margin-top: 10px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-accent);
  font: inherit;
  font-size: 0.78rem;
  cursor: pointer;
}
.sidebar-more-button:hover {
  color: var(--color-ink);
}
.sidebar-more-button:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 3px;
}
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 10px;
}
.tag-list a {
  color: var(--color-subtle);
  font-size: 0.78rem;
}
</style>
