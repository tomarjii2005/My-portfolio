(() => {
  const link = document.getElementById('resume-link'), status = document.getElementById('resume-status'), copy = document.getElementById('resume-copy');
  if (!link) return;
  async function refresh() {
    try {
      const response = await fetch('/.netlify/functions/resume?meta=1', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const data = await response.json();
      if (!data.resume) return;
      const url = '/.netlify/functions/resume?download=1';
      link.href = url; link.hidden = false; link.setAttribute('aria-disabled', 'false'); link.setAttribute('download', 'Kavya-Tomar-Resume.pdf');
      if (status) status.hidden = true;
      if (copy) copy.textContent = 'Download my latest resume for education, experience and skills.';
      window.dispatchEvent(new CustomEvent('portfolio:resume', { detail: { url } }));
    } catch { if (link.hidden && status) status.textContent = 'Resume unavailable right now'; }
  }
  refresh();
  window.addEventListener('pageshow', event => { if (event.persisted) refresh(); });
})();
