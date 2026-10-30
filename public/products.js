let editingId = null;

const form = document.getElementById('productForm');
const rows = document.getElementById('productRows');
const message = document.getElementById('message');
const cancelBtn = document.getElementById('cancelBtn');
const fields = ['name', 'hsn_code', 'unit', 'mrp', 'rate', 'gst_rate'];

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  return td;
}

async function loadProducts() {
  const res = await fetch('/api/products');
  const products = await res.json();
  rows.innerHTML = '';

  for (const p of products) {
    const tr = document.createElement('tr');
    tr.append(cell(p.name), cell(p.hsn_code), cell(p.unit),
              cell(p.mrp), cell(p.rate), cell(p.gst_rate));

    const actions = document.createElement('td');
    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.onclick = () => startEdit(p);
    const delBtn = document.createElement('button');
    delBtn.textContent = 'Delete';
    delBtn.onclick = () => deleteProduct(p.id);
    actions.append(editBtn, delBtn);

    tr.append(actions);
    rows.append(tr);
  }
}

function startEdit(p) {
  editingId = p.id;
  fields.forEach(f => { document.getElementById(f).value = p[f] ?? ''; });
  document.getElementById('formTitle').textContent = 'Edit product';
  cancelBtn.hidden = false;
  window.scrollTo(0, 0);
}

function resetForm() {
  form.reset();
  editingId = null;
  document.getElementById('formTitle').textContent = 'Add product';
  cancelBtn.hidden = true;
  message.textContent = '';
}

async function deleteProduct(id) {
  if (!confirm('Delete this product?')) return;
  const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
  const body = await res.json();
  if (!res.ok) alert(body.error);
  loadProducts();
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {};
  fields.forEach(f => { data[f] = document.getElementById(f).value; });

  const res = await fetch(editingId ? `/api/products/${editingId}` : '/api/products', {
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
  loadProducts();
});

cancelBtn.onclick = resetForm;

requireLogin().then(b => { if (b) loadProducts(); });