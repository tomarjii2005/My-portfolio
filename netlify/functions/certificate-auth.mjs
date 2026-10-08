import { password, matches, issue, authorized, cookie, sameOrigin, json } from '../lib/security.mjs';

export default async function handler(request) {
  if (request.method === 'GET') return json({ authenticated: authorized(request), configured: Boolean(password()) });
  if (!['POST', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
  if (!sameOrigin(request)) return json({ error: 'Origin not allowed.' }, 403);
  if (request.method === 'DELETE') return json({ ok: true }, 200, { 'Set-Cookie': cookie() });
  if (!password()) return json({ error: 'Owner setup needed: set CERTIFICATE_ADMIN_PASSWORD in Netlify to a private password of at least 20 characters, then redeploy.' }, 503);
  if (Number(request.headers.get('content-length') || 0) > 2048) return json({ error: 'Request too large.' }, 413);
  try {
    const raw = await request.text();
    if (raw.length > 2048) return json({ error: 'Request too large.' }, 413);
    const data = JSON.parse(raw);
    if (typeof data.password !== 'string' || !matches(data.password, password())) return json({ error: 'Incorrect password.' }, 401);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(issue()) });
  } catch { return json({ error: 'Invalid request.' }, 400); }
}
export const config = { rateLimit: { action: 'rate_limit', aggregateBy: ['ip', 'domain'], windowSize: 60, windowLimit: 15 } };
