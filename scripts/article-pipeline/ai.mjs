const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

function requiredString(env, name) {
  const value = env[name]?.trim();
  if (!value) throw new Error(name + " is required");
  return value;
}

function readInteger(
  env,
  name,
  fallback,
  { min = 0, max = Number.MAX_SAFE_INTEGER } = {},
) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new Error(
      name +
        " must be an integer between " +
        min +
        " and " +
        max +
        "; received " +
        raw,
    );
  }
  return value;
}

export function loadAiConfig(env = process.env) {
  const rawBaseUrl = requiredString(env, "WEEKLY_DAY_AI_BASE_URL").replace(
    /\/+$/,
    "",
  );
  const endpoint = rawBaseUrl.endsWith("/chat/completions")
    ? rawBaseUrl
    : rawBaseUrl + "/chat/completions";
  const temperature = Number(env.WEEKLY_DAY_AI_TEMPERATURE ?? 0.4);
  if (!Number.isFinite(temperature) || temperature < 0 || temperature > 2) {
    throw new Error(
      "WEEKLY_DAY_AI_TEMPERATURE must be between 0 and 2; received " +
        temperature,
    );
  }

  return Object.freeze({
    baseUrl: rawBaseUrl,
    endpoint,
    apiKey: requiredString(env, "WEEKLY_DAY_AI_API_KEY"),
    model: requiredString(env, "WEEKLY_DAY_AI_MODEL"),
    temperature,
    maxTokens: readInteger(env, "WEEKLY_DAY_AI_MAX_TOKENS", 3500, {
      min: 500,
      max: 20000,
    }),
    requestTimeoutMs: readInteger(
      env,
      "WEEKLY_DAY_AI_REQUEST_TIMEOUT_MS",
      180000,
      { min: 5000, max: 300000 },
    ),
    requestRetries: readInteger(env, "WEEKLY_DAY_AI_REQUEST_RETRIES", 1, {
      min: 0,
      max: 6,
    }),
  });
}

function compactText(value, limit) {
  return typeof value === "string"
    ? value.replace(/\s+/g, " ").trim().slice(0, limit)
    : "";
}

export function buildArticlePrompt(story, sourceText = "") {
  const context = {
    hackerNews: {
      id: story.hnId,
      title: story.title,
      author: story.author,
      score: story.score,
      commentCount: story.commentCount,
      publishedAt: story.publishedAt,
      hackerNewsUrl: story.hnUrl,
      originalUrl: story.originalUrl,
    },
    originalArticleExcerpt:
      compactText(sourceText, 12000) ||
      "[Original article text was unavailable. Use only Hacker News metadata and keep claims cautious.]",
  };

  return [
    "You are an editorial assistant for AI Daily. Produce a careful, original bilingual article based only on the supplied Hacker News context.",
    "Return ONLY one valid JSON object. Do not use Markdown fences or commentary before or after the JSON.",
    "Do not copy long passages from the source. Summarize, explain, and add cautious analysis. Never invent facts, numbers, quotes, or capabilities.",
    "Write both Chinese and English versions with equivalent meaning. Every localized string must be non-empty in both languages.",
    "Use 3 to 5 heading blocks and at least 5 substantial paragraph blocks per language. Structure the article with an introduction, key facts, technical explanation, practical implications, limitations or open questions, and a conclusion. Aim for 700-1100 Chinese characters and 400-600 English words per language. If the source is brief, add cautious analysis and context without inventing facts. Do not end early or compress the article into a short summary. A quote block is optional. Avoid code blocks unless the source genuinely contains a short code example.",
    "The content.zh and content.en fields MUST be JSON arrays, never strings or objects. Every item must be a separate block with type heading, paragraph, quote, or code; heading, paragraph, and quote items must include text: { zh, en }.",
    "The first paragraph must not be the disclosure; the application prepends the disclosure deterministically.",
    "Return this exact shape: { title: { zh, en }, excerpt: { zh, en }, category: { zh, en }, tags: { zh: [], en: [] }, slug: string, content: { zh: PostBlock[], en: PostBlock[] } }.",
    "PostBlock is one of { type: heading, text: { zh, en } }, { type: paragraph, text: { zh, en } }, { type: quote, text: { zh, en } }, or { type: code, language, code }. Use localized text for heading, paragraph, and quote.",
    "SEO requirements: the title becomes the page title, the excerpt becomes the meta description, the slug becomes the URL, and the tags become the page keywords. Before writing, identify one primary keyword and 2-4 secondary keywords that readers would actually type into a search engine, based on the story's technology, product, or company names.",
    "Title: front-load the primary keyword, stay specific and informative, and keep it under 30 Chinese characters or 60 English characters. Avoid filler such as 深度解析 or 'An Analysis of'. Never exceed these limits.",
    "Excerpt: write it as a search-result snippet that states the topic and the key takeaway in complete sentences, include the primary keyword naturally within the first half, and keep it between 70 and 140 characters. Do not open with vague phrases like 本文介绍了 or 'This article discusses'. Never exceed 160 characters.",
    "Headings: make every heading descriptive and include the keyword or a natural variant where it fits; never stuff keywords.",
    "First paragraph: mention the primary keyword naturally within the opening two sentences.",
    "Slug: a lowercase ASCII slug of 3-8 hyphen-separated English words that contains the primary keyword. Tags: 2-5 concrete searchable keywords such as technology, product, or concept names rather than generic labels. Never exceed these limits.",
    "",
    "SOURCE CONTEXT:",
    JSON.stringify(context, null, 2),
  ].join("\n");
}

function extractMessageContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((part) => part?.type === "text" && typeof part.text === "string")
      .map((part) => part.text)
      .join("");
  }
  return "";
}

function parseJsonResponse(content) {
  const unfenced = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();

  try {
    return JSON.parse(unfenced);
  } catch (error) {
    throw new Error("AI response was not valid JSON: " + error.message);
  }
}

function extractDeltaContent(payload) {
  return payload?.choices?.[0]?.delta?.content ?? "";
}

async function readStreamingContent(response) {
  const contentType = response.headers?.get?.("content-type") ?? "";
  if (!contentType.includes("text/event-stream")) {
    // Fallback for gateways that ignore stream:true and return plain JSON.
    const payload = await response.json();
    if (payload?.error) {
      throw new Error(
        "Weekly Day AI API error: " +
          (payload.error.message ?? JSON.stringify(payload.error)),
      );
    }
    return extractMessageContent(payload);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let content = "";
  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    let newlineIndex;
    while ((newlineIndex = buffer.indexOf("\n")) !== -1) {
      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      const payload = JSON.parse(data);
      if (payload.error) {
        throw new Error(
          "Weekly Day AI API error: " +
            (payload.error.message ?? JSON.stringify(payload.error)),
        );
      }
      content += extractDeltaContent(payload);
    }
  }
  return content;
}

export async function requestArticleDraft(
  story,
  sourceText,
  { config, fetchImpl = globalThis.fetch, retryDelayMs = 500 } = {},
) {
  if (!config) throw new Error("AI config is required");

  const body = {
    model: config.model,
    temperature: config.temperature,
    max_tokens: config.maxTokens,
    response_format: { type: "json_object" },
    stream: true,
    messages: [
      { role: "system", content: "You return schema-compliant JSON only." },
      { role: "user", content: buildArticlePrompt(story, sourceText) },
    ],
  };

  let lastError;
  for (let attempt = 0; attempt <= config.requestRetries; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      config.requestTimeoutMs,
    );
    try {
      const response = await fetchImpl(config.endpoint, {
        method: "POST",
        headers: {
          accept: "text/event-stream, application/json",
          authorization: "Bearer " + config.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      if (!response.ok)
        throw new Error(`HTTP ${response.status} for ${config.endpoint}`);
      const content = await readStreamingContent(response);
      if (!content.trim())
        throw new Error("Weekly Day AI returned an empty message");
      return parseJsonResponse(content);
    } catch (error) {
      lastError =
        error?.name === "AbortError"
          ? new Error(
              "Request timed out after " + config.requestTimeoutMs + " ms",
            )
          : error;
      if (attempt === config.requestRetries) break;
      await sleep(retryDelayMs * 2 ** attempt);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error(
    `Failed to stream ${config.endpoint} after ${config.requestRetries + 1} attempt(s): ${lastError?.message ?? lastError}`,
  );
}
