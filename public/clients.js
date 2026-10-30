let editingId = null;

const form = document.getElementById('clientForm');
const rows = document.getElementById('clientRows');
const message = document.getElementById('message');
const cancelBtn = document.getElementById('cancelBtn');
const fields = ['name', 'address', 'gstin', 'state', 'state_code', 'phone'];

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  return td;
}

async function loadClients() {
  const res = await fetch('/api/clients');
  const clients = await res.json();
  rows.innerHTML = '';

  for (const c of clients) {
    const tr = document.createElement('tr');
    tr.append(cell(c.name), cell(c.gstin), cell(c.state), cell(c.phone));

    const countTd = document.createElement('td');
    const link = document.createElement('a');
    link.href = `invoices.html?client_id=${c.id}`;
    link.textContent = c.invoice_count;
    countTd.append(link);

    const actions = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => startEdit(c);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => deleteClient(c.id);
    actions.append(editBtn, delBtn);

    tr.append(countTd, actions);
    rows.append(tr);
  }
}

function startEdit(c) {
  editingId = c.id;
  fields.forEach(f => { document.getElementById(f).value = c[f] ?? ''; });
  document.getElementById('formTitle').textContent = 'Edit client';
  cancelBtn.hidden = false;
  window.scrollTo(0, 0);
}

function resetForm() {
  form.reset();
  editingId = null;
  document.getElementById('formTitle').textContent = 'Add client';
  cancelBtn.hidden = true;
  message.textContent = '';
}

async function deleteClient(id) {
  if (!confirm('Delete this client?')) return;
  const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
  const body = await res.json();
  if (!res.ok) alert(body.error);
  loadClients();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {};
  fields.forEach(f => { data[f] = document.getElementById(f).value; });

  const res = await fetch(editingId ? `/api/clients/${editingId}` : '/api/clients', {
    method: editingId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  const body = await res.json();
  if (!res.ok) {
    message.textContent = body.error;
    return;
  }
  resetForm();
  loadClients();
});

cancelBtn.onclick = resetForm;

requireLogin().then(b => { if (b) loadClients(); });