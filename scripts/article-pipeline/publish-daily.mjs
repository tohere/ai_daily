import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { loadAiConfig } from "./ai.mjs";
import { loadHackerNewsConfig } from "./config.mjs";
import { parseUrlList, selectStoriesFromUrls } from "./direct-source.mjs";
import {
  writeGeneratedArticle,
  generateArticleDocument,
} from "./generate-article.mjs";
import { loadPublishedSources } from "./generated-posts.mjs";
import {
  searchHackerNewsStories,
  selectHackerNewsStories,
} from "./hacker-news.mjs";

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "../..");
const generatedPostsDirectory = path.join(
  projectDirectory,
  "src/data/generated-posts",
);

export async function publishDailyArticles({
  env = process.env,
  now = new Date(),
  fetchImpl = globalThis.fetch,
  sourceFetchImpl = fetchImpl,
  outputDirectory = generatedPostsDirectory,
  onLog = console.log,
  onWarning = console.warn,
} = {}) {
  const hnConfig = loadHackerNewsConfig(env);
  const aiConfig = loadAiConfig(env);
  const { hnIds: publishedHnIds, originalUrls: publishedOriginalUrls } =
    await loadPublishedSources(outputDirectory, { onWarning });

  const articleUrls = parseUrlList(env.ARTICLE_URLS);
  const searchTopic =
    typeof env.ARTICLE_TOPIC === "string" ? env.ARTICLE_TOPIC.trim() : "";

  let selection;
  if (articleUrls.length > 0) {
    onLog(
      "[daily-publish] mode: direct URLs (" + articleUrls.length + " link(s))",
    );
    selection = await selectStoriesFromUrls({
      urls: articleUrls,
      publishedOriginalUrls,
      fetchImpl: sourceFetchImpl,
      now,
      onWarning,
    });
  } else if (searchTopic) {
    onLog('[daily-publish] mode: topic search "' + searchTopic + '"');
    selection = await searchHackerNewsStories({
      topic: searchTopic,
      count: hnConfig.dailyArticleCount,
      requestTimeoutMs: hnConfig.requestTimeoutMs,
      requestRetries: hnConfig.requestRetries,
      publishedHnIds,
      fetchImpl,
      onWarning,
    });
  } else {
    onLog("[daily-publish] mode: Hacker News front page");
    selection = await selectHackerNewsStories({
      ...hnConfig,
      publishedHnIds,
      fetchImpl,
      now,
      onWarning,
    });
  }

  onLog(
    "[daily-publish] selected " + selection.selected.length + " story(ies)",
  );
  const documents = [];
  for (const story of selection.selected) {
    onLog(
      "[daily-publish] generating " +
        (story.hnId ? "HN #" + story.hnId : "web source") +
        ": " +
        story.title,
    );
    const document = await generateArticleDocument(story, {
      config: aiConfig,
      fetchImpl,
      sourceFetchImpl,
      sourceText: story.sourceText,
      now,
    });
    documents.push(document);
  }

  const writtenFiles = [];
  for (const document of documents) {
    const filePath = await writeGeneratedArticle(document, outputDirectory);
    writtenFiles.push(filePath);
    onLog("[daily-publish] wrote " + filePath);
  }

  return { selection, documents, writtenFiles };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const result = await publishDailyArticles();
    console.log(
      "[daily-publish] completed: " +
        result.writtenFiles.length +
        " article(s)",
    );
  } catch (error) {
    console.error("[daily-publish] failed:", error);
    process.exitCode = 1;
  }
}
