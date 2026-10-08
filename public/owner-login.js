(() => {
  const form = document.getElementById('login-form'), button = document.getElementById('login-button'), notice = document.getElementById('notice');
  form.addEventListener('submit', async event => {
    event.preventDefault(); button.disabled = true; notice.textContent = 'Signing in…';
    try {
      const response = await fetch('/.netlify/functions/certificate-auth', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: document.getElementById('password').value }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || (response.status === 429 ? 'Wait a minute before trying again.' : 'Sign in unavailable. Please retry.'));
      document.getElementById('password').value = ''; location.replace('/admin');
    } catch (error) { notice.textContent = error.message; notice.className = 'notice error'; } finally { button.disabled = false; }
  });
})();
