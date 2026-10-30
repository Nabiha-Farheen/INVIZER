let products = [];
const params = new URLSearchParams(window.location.search);
const filterClientId = params.get('client_id');

const form = document.getElementById('invoiceForm');
const clientSelect = document.getElementById('client');
const itemRows = document.getElementById('itemRows');
const rows = document.getElementById('invoiceRows');
const message = document.getElementById('message');

const money = (n) => Number(n).toFixed(2);

function cell(text) {
  const td = document.createElement('td');
  td.textContent = text ?? '';
  return td;
}

// One row = one product + quantity
function addRow() {
  const row = document.createElement('div');
  row.className = 'item-row';

  const select = document.createElement('select');
  const first = document.createElement('option');
  first.value = '';
  first.textContent = 'Choose product';
  select.append(first);
  for (const p of products) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} (rate ${p.rate})`;
    select.append(opt);
  }

  const qty = document.createElement('input');
  qty.type = 'number';
  qty.min = '0.01';
  qty.step = 'any';
  qty.placeholder = 'Qty';

  const amount = document.createElement('span');
  amount.className = 'amount';
  amount.textContent = '0.00';

  const remove = document.createElement('button');
  remove.type = 'button';
  remove.textContent = 'X';
  remove.onclick = () => { row.remove(); updateSubtotal(); };

  select.onchange = updateSubtotal;
  qty.oninput = updateSubtotal;

  row.append(select, qty, amount, remove);
  itemRows.append(row);
}

// Shows each line's amount (qty x rate) and the subtotal.
// GST is calculated by the server when you save.
function updateSubtotal() {
  let subtotal = 0;
  document.querySelectorAll('.item-row').forEach(row => {
    const productId = row.querySelector('select').value;
    const qty = Number(row.querySelector('input').value);
    const p = products.find(x => String(x.id) === productId);
    const amount = p && qty > 0 ? qty * Number(p.rate) : 0;
    row.querySelector('.amount').textContent = money(amount);
    subtotal += amount;
  });
  document.getElementById('subtotal').textContent = money(subtotal);
}

async function loadInvoices() {
  const url = filterClientId ? `/api/invoices?client_id=${filterClientId}` : '/api/invoices';
  const res = await fetch(url);
  const invoices = await res.json();
  rows.innerHTML = '';

  for (const inv of invoices) {
    const tr = document.createElement('tr');
    tr.append(cell(inv.invoice_no), cell(String(inv.invoice_date).slice(0, 10)),
              cell(inv.client_name), cell('₹' + money(inv.total)));

    const statusTd = document.createElement('td');
    const statusBtn = document.createElement('button');
    statusBtn.textContent = inv.status === 'paid' ? 'Paid' : 'Pending';
    statusBtn.onclick = () => toggleStatus(inv);
    statusTd.append(statusBtn);

    const viewTd = document.createElement('td');
    const link = document.createElement('a');
    link.href = `invoice-view.html?id=${inv.id}`;
    link.textContent = 'View / Print';
    viewTd.append(link);

    tr.append(statusTd, viewTd);
    rows.append(tr);
  }
}

async function toggleStatus(inv) {
  await fetch(`/api/invoices/${inv.id}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: inv.status === 'paid' ? 'pending' : 'paid' })
  });
  loadInvoices();
}

document.getElementById('addRow').onclick = addRow;

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  message.style.color = '#c53030';

  const items = [];
  document.querySelectorAll('.item-row').forEach(row => {
    const product_id = row.querySelector('select').value;
    const qty = row.querySelector('input').value;
    if (product_id && qty) items.push({ product_id: Number(product_id), qty: Number(qty) });
  });
  if (items.length === 0) {
    message.textContent = 'Add at least one product with a quantity';
    return;
  }

  const res = await fetch('/api/invoices', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: Number(clientSelect.value),
      invoice_date: document.getElementById('invoice_date').value,
      due_date: document.getElementById('due_date').value || null,
      items
    })
  });
  const body = await res.json();
  if (!res.ok) {
    message.textContent = body.error;
    return;
  }

  message.style.color = '#2f855a';
  message.textContent = `Invoice ${body.invoice_no} created. Total: ₹${body.total}`;
  itemRows.innerHTML = '';
  addRow();
  updateSubtotal();
  loadInvoices();
});

async function init() {
  const business = await requireLogin();
  if (!business) return;

  const [cRes, pRes] = await Promise.all([fetch('/api/clients'), fetch('/api/products')]);
  const clients = await cRes.json();
  products = await pRes.json();

  for (const c of clients) {
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.name;
    clientSelect.append(opt);
  }

  if (filterClientId) {
    clientSelect.value = filterClientId;
    const c = clients.find(x => String(x.id) === filterClientId);
    document.getElementById('listTitle').textContent = 'Invoices for ' + (c ? c.name : 'this client');
    document.getElementById('showAll').hidden = false;
  }

  if (clients.length === 0 || products.length === 0) {
    message.textContent = 'Add at least one client and one product first.';
  }

  document.getElementById('invoice_date').value = new Date().toLocaleDateString('en-CA');
  addRow();
  loadInvoices();
}

init();