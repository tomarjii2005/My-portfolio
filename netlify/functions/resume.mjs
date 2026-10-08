import { getStore } from '@netlify/blobs';
import { authorized, sameOrigin, json } from '../lib/security.mjs';

const maxBytes = 4 * 1024 * 1024;
export function createHandler(storeFactory = () => getStore({ name: 'kavya-resume', consistency: 'strong' })) {
  return async function handler(request) {
    const url = new URL(request.url);
    if (!['GET', 'POST'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
    if (request.method === 'POST') {
      if (!sameOrigin(request)) return json({ error: 'Origin not allowed.' }, 403);
      if (!authorized(request)) return json({ error: 'Please sign in again.' }, 401);
    }
    try {
      const store = storeFactory();
      if (request.method === 'GET' && url.searchParams.has('meta')) {
        const current = await store.getMetadata('current.pdf');
        return json({ resume: current ? { name: 'Kavya-Tomar-Resume.pdf', uploadedAt: current.metadata.uploadedAt, size: current.metadata.size } : null });
      }
      if (request.method === 'GET') {
        const bytes = await store.get('current.pdf', { type: 'arrayBuffer' });
        if (!bytes) return json({ error: 'Resume has not been published yet.' }, 404);
        return new Response(bytes, { headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `${url.searchParams.has('download') ? 'attachment' : 'inline'}; filename="Kavya-Tomar-Resume.pdf"`,
          'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': "sandbox; default-src 'none'", 'X-Frame-Options': 'SAMEORIGIN'
        } });
      }
      if (Number(request.headers.get('content-length') || 0) > maxBytes + 32000) return json({ error: 'Maximum PDF size is 4 MB.' }, 413);
      const body = await request.arrayBuffer();
      if (body.byteLength > maxBytes + 32000) return json({ error: 'Maximum PDF size is 4 MB.' }, 413);
      const data = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || '' }, body }).formData();
      const file = data.get('file');
      if (!file || typeof file.arrayBuffer !== 'function' || !file.size || file.size > maxBytes) return json({ error: 'Choose one PDF file, up to 4 MB.' }, 400);
      const bytes = await file.arrayBuffer();
      if (Buffer.from(bytes).subarray(0,5).toString() !== '%PDF-') return json({ error: 'Resume must be a PDF file.' }, 400);
      const metadata = { uploadedAt: new Date().toISOString(), size: bytes.byteLength };
      // A single atomic blob replaces both the resume and its metadata together.
      await store.set('current.pdf', bytes, { metadata });
      return json({ resume: { name: 'Kavya-Tomar-Resume.pdf', ...metadata } }, 201);
    } catch (error) {
      console.error('Resume operation failed:', error?.name || 'StorageError');
      return json({ error: 'Resume storage is unavailable. Please retry shortly.' }, 503);
    }
  };
}
export default createHandler();
