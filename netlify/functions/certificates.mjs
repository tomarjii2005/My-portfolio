import { getStore } from '@netlify/blobs';
import { randomUUID } from 'node:crypto';
import { authorized, sameOrigin, json } from '../lib/security.mjs';

const limit = 4 * 1024 * 1024;
const idPattern = /^[a-f0-9-]{36}$/;
function fileType(bytes) {
  const b = Buffer.from(bytes);
  if (b.subarray(0, 5).toString() === '%PDF-') return ['application/pdf', 'pdf'];
  if (b.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return ['image/png', 'png'];
  if (b[0] === 255 && b[1] === 216 && b[2] === 255) return ['image/jpeg', 'jpg'];
  if (b.subarray(0,4).toString() === 'RIFF' && b.subarray(8,12).toString() === 'WEBP') return ['image/webp', 'webp'];
  return null;
}
export function createHandler(storeFactory = () => getStore({ name: 'kavya-certificates', consistency: 'strong' })) {
  return async function handler(request) {
    const url = new URL(request.url), id = url.searchParams.get('id');
    if (!['GET', 'POST', 'DELETE'].includes(request.method)) return json({ error: 'Method not allowed.' }, 405);
    if (request.method !== 'GET') {
      if (!sameOrigin(request)) return json({ error: 'Origin not allowed.' }, 403);
      if (!authorized(request)) return json({ error: 'Please log in again.' }, 401);
    }
    if (id && !idPattern.test(id)) return json({ error: 'Invalid certificate.' }, 400);
    try {
      const store = storeFactory();
      if (request.method === 'GET' && id) {
        const item = await store.get('items/' + id, { type: 'json' });
        if (!item) return json({ error: 'Certificate not found.' }, 404);
        const file = await store.get('files/' + id, { type: 'arrayBuffer' });
        if (!file) return json({ error: 'Certificate not found.' }, 404);
        const disposition = url.searchParams.has('download') ? 'attachment' : 'inline';
        return new Response(file, { headers: { 'Content-Type': item.mime, 'Content-Disposition': `${disposition}; filename="certificate-${id}.${item.extension}"`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "sandbox; default-src 'none'", 'X-Frame-Options': 'SAMEORIGIN' } });
      }
      if (request.method === 'GET') {
        const { blobs } = await store.list({ prefix: 'items/' });
        const items = (await Promise.all(blobs.map(b => store.get(b.key, { type: 'json' })))).filter(Boolean).sort((a,b) => b.createdAt.localeCompare(a.createdAt));
        return json({ items });
      }
      if (request.method === 'DELETE') {
        if (!id) return json({ error: 'Choose a certificate.' }, 400);
        await store.delete('items/' + id);
        await store.delete('files/' + id);
        return json({ ok: true });
      }
      if (Number(request.headers.get('content-length') || 0) > limit + 32000) return json({ error: 'Maximum file size is 4 MB.' }, 413);
      const body = await request.arrayBuffer();
      if (body.byteLength > limit + 32000) return json({ error: 'Maximum file size is 4 MB.' }, 413);
      const data = await new Request(request.url, { method: 'POST', headers: { 'Content-Type': request.headers.get('content-type') || '' }, body }).formData();
      const file = data.get('file');
      if (!file || typeof file.arrayBuffer !== 'function' || !file.size || file.size > limit) return json({ error: 'Choose a PDF, JPG, PNG or WebP file, up to 4 MB.' }, 400);
      const bytes = await file.arrayBuffer(), type = fileType(bytes);
      if (!type) return json({ error: 'Only genuine PDF, JPG, PNG and WebP files are accepted.' }, 400);
      const title = String(data.get('title') || '').trim();
      const issuer = String(data.get('issuer') || '').trim();
      const category = String(data.get('category') || 'certificate');
      const date = String(data.get('date') || '');
      if (!title || title.length > 120 || issuer.length > 120 || !['certificate','achievement'].includes(category) || (date && (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))))) return json({ error: 'Please check the title, issuer, category and date.' }, 400);
      const newId = randomUUID();
      const item = { id: newId, title, issuer, category, date, mime: type[0], extension: type[1], createdAt: new Date().toISOString() };
      await store.set('files/' + newId, bytes);
      try { await store.setJSON('items/' + newId, item); } catch (error) { await store.delete('files/' + newId); throw error; }
      return json({ item }, 201);
    } catch (error) {
      console.error('Certificate operation failed:', error?.name || 'StorageError');
      return json({ error: 'Certificate storage is unavailable. Please retry shortly or check the Netlify deployment.' }, 503);
    }
  };
}
export default createHandler();
