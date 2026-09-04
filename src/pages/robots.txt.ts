export const prerender = true

export function GET(): Response {
  const body = [
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${import.meta.env.SITE}/sitemap.xml`,
  ].join('\n') + '\n'
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
