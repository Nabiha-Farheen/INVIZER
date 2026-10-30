const STANDARD = {
  description: 'Description of Goods', hsn_code: 'HSN/SAC', mrp: 'MRP', qty: 'Quantity',
  rate: 'Rate', unit: 'per', gst_rate: 'GST %', amount: 'Amount'
};
const REQUIRED = ['description', 'qty', 'rate', 'amount'];

let layout = { columns: [], headerFields: [] };
const message = document.getElementById('message');

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40);

function makeButton(text, onclick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = text;
  b.onclick = onclick;
  return b;
}

function move(list, i, step) {
  const j = i + step;
  if (j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  render();
}

function buildRows(containerId, list, canRemove) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  list.forEach((item, i) => {
    const row = document.createElement('div');
    row.className = 'item-row';

    const label = document.createElement('input');
    label.value = item.label;
    label.oninput = () => { item.label = label.value; };

    row.append(label,
      makeButton('\u2191', () => move(list, i, -1)),
      makeButton('\u2193', () => move(list, i, 1)));
    if (canRemove(item)) {
      row.append(makeButton('X', () => { list.splice(i, 1); render(); }));
    }
    box.append(row);
  });
}

function render() {
  buildRows('columns', layout.columns, item => !REQUIRED.includes(item.key));
  buildRows('headerFields', layout.headerFields, () => true);

  const select = document.getElementById('stdSelect');
  select.innerHTML = '';
  for (const key of Object.keys(STANDARD)) {
    if (layout.columns.some(c => c.key === key)) continue;
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = STANDARD[key];
    select.append(opt);
  }
}

function showError(text) {
  message.style.color = '#c53030';
  message.textContent = text;
}

document.getElementById('addStd').onclick = () => {
  const key = document.getElementById('stdSelect').value;
  if (!key) return;
  layout.columns.push({ key, label: STANDARD[key] });
  message.textContent = '';
  render();
};

document.getElementById('addCustom').onclick = () => {
  const input = document.getElementById('customCol');
  const key = slug(input.value);
  if (!key) return;
  if (key in STANDARD || layout.columns.some(c => c.key === key)) {
    return showError('That column already exists');
  }
  layout.columns.push({ key, label: input.value.trim() });
  input.value = '';
  message.textContent = '';
  render();
};

document.getElementById('addHeader').onclick = () => {
  const input = document.getElementById('newHeader');
  const key = slug(input.value);
  if (!key) return;
  if (layout.headerFields.some(h => h.key === key)) {
    return showError('That box already exists');
  }
  layout.headerFields.push({ key, label: input.value.trim() });
  input.value = '';
  message.textContent = '';
  render();
};

document.getElementById('save').onclick = async () => {
  const res = await fetch('/api/layout', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(layout)
  });
  const body = await res.json();
  if (!res.ok) return showError(body.error);
  layout = body.layout;
  render();
  message.style.color = '#2f855a';
  message.textContent = 'Layout saved';
};

async function load() {
  const res = await fetch('/api/layout');
  layout = await res.json();
  render();
}

requireLogin().then(b => { if (b) load(); });