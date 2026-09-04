// Pages Function: /api/views —— 阅读计数（同域，无需 CORS）
// POST { path }        计数 +1（同 IP 同文章同天只计一次），返回最新计数
// GET  ?paths=a,b,c    批量只读查询（列表页用，≤50 条）
// KV 绑定 VIEWS：Pages 项目 Settings → Bindings 添加 KV namespace（view-counter）
// KV 免费额度：读 10 万/天、写 1000/天；写超限时降级为只返回现有计数

interface FunctionContext {
  request: Request;
  env: { VIEWS: { get(key: string): Promise<string | null>; put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void> } };
}

// 中英文路径合并为同一篇文章的规范路径（/zh/posts/x/ -> /posts/x/）
function canonicalPath(raw: string): string | null {
  try {
    const url = new URL(raw, 'https://counter.local');
    const path = url.pathname.replace(/^\/(zh|en)(?=\/)/, '');
    return path.startsWith('/posts/') && path.endsWith('/') ? path : null;
  } catch {
    return null;
  }
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8' } });

export const onRequestPost = async ({ request, env }: FunctionContext) => {
  const body = await request.json().catch(() => null);
  const canonical = canonicalPath(body?.path ?? '');
  if (!canonical) return json({ error: 'Invalid path' }, 400);

  // 同 IP 同文章同天去重（IP 只存哈希，不存原文）
  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const day = new Date().toISOString().slice(0, 10);
  const dedupKey = `dup:${await sha256Hex(`${ip}|${canonical}|${day}`)}`;
  const key = `view:${canonical}`;
  let current = parseInt((await env.VIEWS.get(key)) ?? '0', 10);
  let counted = false;
  if (!(await env.VIEWS.get(dedupKey))) {
    current += 1;
    counted = true;
    try {
      await env.VIEWS.put(key, String(current));
      await env.VIEWS.put(dedupKey, '1', { expirationTtl: 90000 }); // ~25h
    } catch {
      current -= 1; // 当日写配额耗尽：降级为只返回现有计数
      counted = false;
    }
  }
  return json({ views: current, counted });
};

export const onRequestGet = async ({ request, env }: FunctionContext) => {
  const paths = (new URL(request.url).searchParams.get('paths') ?? '')
    .split(',').map((p) => p.trim()).filter(Boolean).slice(0, 50);
  if (!paths.length) return json({ error: 'Missing paths' }, 400);

  const pairs = await Promise.all(paths.map(async (raw) => {
    const canonical = canonicalPath(raw);
    const views = canonical ? parseInt((await env.VIEWS.get(`view:${canonical}`)) ?? '0', 10) : 0;
    return [raw, views];
  }));
  return json({ views: Object.fromEntries(pairs) });
};
