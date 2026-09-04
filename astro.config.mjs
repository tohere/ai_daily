// @ts-check
import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";

export default defineConfig({
  site: "https://ai.weekly-day.top",
  integrations: [vue()],
});
