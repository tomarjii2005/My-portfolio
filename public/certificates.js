(() => {
  const api = '/.netlify/functions/certificates';
  const grid = document.getElementById('honors-grid');
  if (!grid) return;
  const state = document.getElementById('honors-state');
  const dialog = document.getElementById('certificate-viewer');
  const preview = document.getElementById('certificate-preview');
  let items = [], selected = 'all', opener;
  function text(tag, className, value) { const el = document.createElement(tag); el.className = className; el.textContent = value; return el; }
  function fileURL(id) { return api + '?id=' + encodeURIComponent(id); }
  function open(item, button) {
    const url = fileURL(item.id);
    if (!dialog.showModal) { window.open(url, '_blank', 'noopener'); return; }
    opener = button;
    document.getElementById('certificate-title').textContent = item.title;
    document.getElementById('certificate-issuer').textContent = [item.issuer, item.date].filter(Boolean).join(' · ');
    preview.replaceChildren();
    if (item.mime === 'application/pdf') {
      const frame = document.createElement('iframe'); frame.src = url; frame.title = item.title; preview.append(frame);
    } else {
      const image = document.createElement('img'); image.src = url; image.alt = item.title; preview.append(image);
    }
    document.getElementById('certificate-new-tab').href = url;
    document.getElementById('certificate-download').href = url + '&download=1';
    dialog.showModal();
  }
  document.getElementById('certificate-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', e => { if (e.target === dialog) { const r = dialog.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) dialog.close(); } });
  dialog.addEventListener('close', () => { preview.replaceChildren(); opener?.focus(); });
  function render() {
    grid.replaceChildren();
    const filtered = items.filter(item => selected === 'all' || item.category === selected);
    state.hidden = filtered.length > 0;
    state.textContent = items.length ? 'No items in this category yet.' : 'A space for the learning, milestones and wins along the way. Published certificates will appear here.';
    filtered.forEach((item, i) => {
      const wrap = text('div', 'honor-orbit', ''); wrap.style.setProperty('--delay', `${-i * 1.4}s`);
      const card = text('button', 'honor-card', ''); card.type = 'button'; card.setAttribute('aria-label', 'View ' + item.title);
      const cover = text('div', 'honor-cover', '');
      if (item.mime.startsWith('image/')) {
        const image = document.createElement('img'); image.src = fileURL(item.id); image.alt = ''; image.loading = 'lazy'; cover.append(image);
      } else { const glyph = text('span', 'honor-glyph', item.category === 'achievement' ? '✧' : '▤'); glyph.setAttribute('aria-hidden', 'true'); cover.append(glyph); }
      cover.append(text('span', 'honor-mark', item.category));
      const info = text('div', 'honor-info', ''); info.append(text('h3', '', item.title), text('p', '', [item.issuer, item.date].filter(Boolean).join(' · ')), text('span', 'honor-open', 'OPEN ' + (item.category === 'achievement' ? 'ACHIEVEMENT' : 'CERTIFICATE') + ' ↗'));
      card.append(cover, info); card.addEventListener('click', () => open(item, card));
      if (matchMedia('(hover:hover) and (prefers-reduced-motion:no-preference)').matches) {
        card.addEventListener('pointermove', event => {
          if (document.documentElement.classList.contains('motion-paused') || document.body.classList.contains('motion-paused')) return;
          const rect = card.getBoundingClientRect();
          card.style.setProperty('--rx', `${-(event.clientY - rect.top - rect.height / 2) / rect.height * 5}deg`);
          card.style.setProperty('--ry', `${(event.clientX - rect.left - rect.width / 2) / rect.width * 5}deg`);
        });
        card.addEventListener('pointerleave', () => { card.style.setProperty('--rx', '0deg'); card.style.setProperty('--ry', '0deg'); });
      }
      wrap.append(card); grid.append(wrap);
    });
  }
  document.querySelectorAll('[data-honors-filter]').forEach(button => button.addEventListener('click', () => {
    selected = button.dataset.honorsFilter;
    document.querySelectorAll('[data-honors-filter]').forEach(b => b.setAttribute('aria-pressed', String(b === button))); render();
  }));
  async function load() {
    try { const response = await fetch(api, { cache: 'no-store' }); if (!response.ok) throw new Error(); const data = await response.json(); items = data.items; render(); }
    catch { state.hidden = false; state.replaceChildren(text('span', '', 'Certificates could not be loaded right now. ')); const retry = text('button', 'cert-btn', 'Try again'); retry.type = 'button'; retry.addEventListener('click', load); state.append(retry); }
  }
  load();
})();
