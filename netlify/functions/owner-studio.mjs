import { authorized } from '../lib/security.mjs';
import { loginHTML, studioHTML } from '../lib/studio-pages.mjs';

export default function handler(request) {
  if (!['GET', 'HEAD'].includes(request.method)) return new Response('Method not allowed', { status: 405 });
  return new Response(request.method === 'HEAD' ? null : authorized(request) ? studioHTML : loginHTML, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'private, no-store, max-age=0',
      'Netlify-CDN-Cache-Control': 'no-store',
      'Vary': 'Cookie',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Referrer-Policy': 'no-referrer',
      'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'"
    }
  });
}
export const config = { path: ['/admin', '/admin/', '/admin.html'] };
