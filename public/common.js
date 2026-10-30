async function requireLogin() {
  const res = await fetch('/api/auth/me');
  if (!res.ok) {
    window.location.href = '/index.html';
    return null;
  }
  return res.json();
}

async function logout() {
  await fetch('/api/auth/logout', { method: 'POST' });
  window.location.href = '/index.html';
}