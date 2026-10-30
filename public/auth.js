const loginForm = document.getElementById('loginForm');
const signupForm = document.getElementById('signupForm');
const message = document.getElementById('message');

document.getElementById('showSignup').onclick = () => {
  loginForm.hidden = true;
  signupForm.hidden = false;
  message.textContent = '';
};
document.getElementById('showLogin').onclick = () => {
  signupForm.hidden = true;
  loginForm.hidden = false;
  message.textContent = '';
};

async function post(url, data) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const body = await res.json();
  return { ok: res.ok, body };
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { ok, body } = await post('/api/auth/login', {
    login_id: document.getElementById('loginId').value,
    password: document.getElementById('loginPassword').value
  });
  if (ok) window.location.href = '/dashboard.html';
  else message.textContent = body.error;
});

signupForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const { ok, body } = await post('/api/auth/signup', {
    name: document.getElementById('bName').value,
    login_id: document.getElementById('bLoginId').value,
    password: document.getElementById('bPassword').value,
    invoice_prefix: document.getElementById('bPrefix').value
  });
  if (ok) {
    signupForm.hidden = true;
    loginForm.hidden = false;
    message.textContent = 'Registered! Now log in.';
  } else {
    message.textContent = body.error;
  }
});