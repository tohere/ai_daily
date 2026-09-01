export const prerender = true

export function GET(): Response {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://www.weekly-day.top/sitemap.xml',
  ].join('\n') + '\n'
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
