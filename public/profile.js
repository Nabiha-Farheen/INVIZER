const fields = ['name', 'address', 'gstin', 'state', 'state_code',
                'dl_no', 'cin', 'pan', 'fssai', 'invoice_prefix'];
const form = document.getElementById('profileForm');
const message = document.getElementById('message');

async function load() {
  const res = await fetch('/api/business');
  const b = await res.json();
  fields.forEach(f => { document.getElementById(f).value = b[f] ?? ''; });
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {};
  fields.forEach(f => { data[f] = document.getElementById(f).value; });

  const res = await fetch('/api/business', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const body = await res.json();
  message.style.color = res.ok ? '#2f855a' : '#c53030';
  message.textContent = res.ok ? 'Profile saved' : body.error;
});

requireLogin().then(b => { if (b) load(); });