// View counter Worker: POST /api/views (increment) + GET /api/views?paths= (batch read)
// KV free tier: reads 100k/day, writes 1k/day. Write failures degrade gracefully —
// the API still returns the current count so the site never breaks.

const JSON_HEADERS = { 'Content-Type': 'application/json; charset=utf-8' };

function corsHeaders(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS ?? 'http://localhost:4321')
    .split(',').map((s) => s.trim()).filter(Boolean);
  const headers = { ...JSON_HEADERS };
  if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }
  return headers;
}

// Merge zh/en variants of the same article into one canonical path (/zh/posts/x/ -> /posts/x/)
function canonicalPath(raw) {
  try {
    const url = new URL(raw, 'https://counter.local');
    const path = url.pathname.replace(/^\/(zh|en)(?=\/)/, '');
    return path.startsWith('/posts/') && path.endsWith('/') ? path : null;
  } catch {
    return null;
  }
}

async function sha256Hex(text) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin');
    const headers = corsHeaders(origin, env);
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: { ...headers, 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS', 'Access-Control-Max-Age': '86400' } });
    }

    if (url.pathname !== '/api/views') {
      return Response.json({ error: 'Not found' }, { status: 404, headers });
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => null);
      const canonical = canonicalPath(body?.path ?? '');
      if (!canonical) {
        return Response.json({ error: 'Invalid path' }, { status: 400, headers });
      }
      // One view per IP per article per day (IP is hashed, never stored raw)
      const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
      const day = new Date().toISOString().slice(0, 10);
      const dedupKey = `dup:${await sha256Hex(`${ip}|${canonical}|${day}`)}`;
      const key = `view:${canonical}`;
      let current = parseInt(await env.VIEWS.get(key) ?? '0', 10);
      let counted = false;
      if (!(await env.VIEWS.get(dedupKey))) {
        current += 1;
        counted = true;
        try {
          await env.VIEWS.put(key, String(current));
          await env.VIEWS.put(dedupKey, '1', { expirationTtl: 90000 }); // ~25h
        } catch {
          current -= 1; // write quota exhausted today: keep serving the stored count
          counted = false;
        }
      }
      return Response.json({ views: current, counted }, { headers });
    }

    if (request.method === 'GET') {
      const paths = (url.searchParams.get('paths') ?? '').split(',').map((p) => p.trim()).filter(Boolean).slice(0, 50);
      if (!paths.length) {
        return Response.json({ error: 'Missing paths' }, { status: 400, headers });
      }
      const pairs = await Promise.all(paths.map(async (raw) => {
        const canonical = canonicalPath(raw);
        const views = canonical ? parseInt(await env.VIEWS.get(`view:${canonical}`) ?? '0', 10) : 0;
        return [raw, views];
      }));
      return Response.json({ views: Object.fromEntries(pairs) }, { headers });
    }

    return Response.json({ error: 'Method not allowed' }, { status: 405, headers });
  },
};
