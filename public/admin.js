(() => {
  const $ = id => document.getElementById(id), auth = '/.netlify/functions/certificate-auth', api = '/.netlify/functions/certificates';
  let signedIn = false;
  function note(message, type = '') { $('notice').textContent = message; $('notice').className = 'notice ' + type; }
  function session(value) { signedIn = value; $('studio').hidden = !value; $('login-panel').hidden = value; }
  async function result(response) { let body; try { body = await response.json(); } catch { throw new Error(response.status === 429 ? 'Too many attempts. Wait a minute and retry.' : 'Server unavailable. Check the Netlify deployment.'); } if (!response.ok) { if (response.status === 401) session(false); throw new Error(body.error || 'Please try again.'); } return body; }
  async function list() {
    const data = await result(await fetch(api, { cache: 'no-store' })); $('published-list').replaceChildren();
    if (!data.items.length) { $('published-list').textContent = 'Your first upload starts the collection.'; return; }
    data.items.forEach(item => {
      const row = document.createElement('div'); row.className = 'saved-item'; const copy = document.createElement('div'); const title = document.createElement('strong'); title.textContent = item.title; const sub = document.createElement('span'); sub.textContent = [item.category, item.issuer, item.date].filter(Boolean).join(' · '); copy.append(title, sub);
      const actions = document.createElement('div'); actions.className = 'actions'; const view = document.createElement('a'); view.className = 'cert-btn'; view.href = api + '?id=' + encodeURIComponent(item.id); view.target = '_blank'; view.rel = 'noopener'; view.textContent = 'View ↗'; const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'cert-btn danger'; remove.textContent = 'Remove'; remove.addEventListener('click', async () => { if (!confirm('Remove “' + item.title + '” from the public portfolio? Keep a copy on your device; removal cannot be undone here.')) return; remove.disabled = true; try { await result(await fetch(api + '?id=' + encodeURIComponent(item.id), { method: 'DELETE' })); await list(); note('Item removed.', 'success'); } catch (error) { note(error.message, 'error'); } finally { remove.disabled = false; } }); actions.append(view, remove); row.append(copy, actions); $('published-list').append(row);
    });
  }
  $('login-form').addEventListener('submit', async e => {
    e.preventDefault(); $('login-button').disabled = true;
    try { await result(await fetch(auth, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('password').value }) })); $('password').value = ''; session(true); await list(); note('Signed in. Ready to publish.', 'success'); }
    catch (error) { note(error.message, 'error'); } finally { $('login-button').disabled = false; }
  });
  $('logout').addEventListener('click', async () => { try { await result(await fetch(auth, { method: 'DELETE' })); session(false); note('Signed out.'); } catch (error) { note(error.message, 'error'); } });
  function chosen() { const file = $('upload-file').files[0]; if (!file) return; $('file-info').textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(2)} MB`; if (!$('upload-title').value) $('upload-title').value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]/g, ' ').slice(0,120); }
  $('upload-file').addEventListener('change', chosen);
  ['dragenter', 'dragover'].forEach(name => $('drop-zone').addEventListener(name, e => { e.preventDefault(); $('drop-zone').classList.add('over'); }));
  ['dragleave', 'drop'].forEach(name => $('drop-zone').addEventListener(name, e => { e.preventDefault(); $('drop-zone').classList.remove('over'); }));
  $('drop-zone').addEventListener('drop', e => { if (e.dataTransfer.files.length !== 1) { note('Please upload one file at a time.', 'error'); return; } $('upload-file').files = e.dataTransfer.files; chosen(); });
  $('upload-form').addEventListener('submit', e => {
    e.preventDefault(); if (!signedIn || !$('upload-form').reportValidity()) return;
    const file = $('upload-file').files[0]; if (!file || file.size > 4 * 1024 * 1024 || !/\.(pdf|jpe?g|png|webp)$/i.test(file.name)) { note('Choose a PDF, JPG, PNG or WebP file up to 4 MB.', 'error'); return; }
    $('publish-button').disabled = true; $('publish-button').textContent = 'Publishing…'; $('upload-progress').hidden = false; $('upload-progress').value = 0; note('Uploading. Keep this page open.');
    const xhr = new XMLHttpRequest(); xhr.open('POST', api); xhr.timeout = 120000;
    xhr.upload.onprogress = event => { if (event.lengthComputable) $('upload-progress').value = event.loaded / event.total * 100; };
    xhr.onload = async () => { try { const data = JSON.parse(xhr.responseText); if (xhr.status < 200 || xhr.status >= 300) { if (xhr.status === 401) session(false); throw new Error(data.error || 'Upload failed.'); } $('upload-form').reset(); $('file-info').textContent = 'Or choose a file from your device.'; await list(); note('Published! Visitors can now see this on your portfolio.', 'success'); } catch (error) { note(error.message, 'error'); } finally { done(); } };
    function done() { $('publish-button').disabled = false; $('publish-button').textContent = 'Publish to portfolio ↗'; $('upload-progress').hidden = true; }
    xhr.onerror = () => { note('Connection lost. Check Published items before retrying.', 'error'); done(); }; xhr.ontimeout = () => { note('Upload timed out. Check Published items before retrying.', 'error'); done(); };
    xhr.send(new FormData($('upload-form')));
  });
  (async () => { try { const data = await result(await fetch(auth, { cache: 'no-store' })); session(data.authenticated); if (data.authenticated) await list(); if (!data.configured) note('First-time setup: add CERTIFICATE_ADMIN_PASSWORD in Netlify (at least 20 characters), then redeploy. Keep it private.', 'error'); } catch (error) { note(error.message, 'error'); } })();
})();
