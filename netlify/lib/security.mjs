import { createHmac, createHash, randomBytes, timingSafeEqual } from 'node:crypto';

const cookieName = '__Host-kavya-admin';
export function password() {
  const value = process.env.CERTIFICATE_ADMIN_PASSWORD || '';
  return value.length >= 20 ? value : null;
}
function digest(value) { return createHash('sha256').update(value).digest(); }
export function matches(a, b) { return timingSafeEqual(digest(a), digest(b)); }
function signature(body) { return createHmac('sha256', password()).update('portfolio-admin:' + body).digest('base64url'); }
export function issue() {
  const body = Buffer.from(JSON.stringify({ exp: Date.now() + 3600000, nonce: randomBytes(16).toString('hex') })).toString('base64url');
  return body + '.' + signature(body);
}
export function authorized(request) {
  if (!password()) return false;
  const token = (request.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token || token.length > 500) return false;
  const [body, sig, extra] = token.split('.');
  if (!body || !sig || extra || !matches(sig, signature(body))) return false;
  try { const { exp } = JSON.parse(Buffer.from(body, 'base64url').toString()); return typeof exp === 'number' && exp > Date.now() && exp <= Date.now() + 3600000; } catch { return false; }
}
export function cookie(token = '') { return `${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${token ? 3600 : 0}`; }
export function sameOrigin(request) { return request.headers.get('origin') === new URL(request.url).origin; }
export function json(data, status = 200, extra = {}) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...extra } });
}
