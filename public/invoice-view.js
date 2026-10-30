const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => Number(n ?? 0).toFixed(2);
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const fmtDate = (d) => d ? String(d).slice(0, 10).split('-').reverse().join('-') : '';

// Indian-style amount in words
const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
  'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  return n < 20 ? ones[n] : tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
}
function threeDigits(n) {
  const h = Math.floor(n / 100), r = n % 100;
  return (h ? ones[h] + ' Hundred' + (r ? ' ' : '') : '') + (r ? twoDigits(r) : '');
}
function amountInWords(num) {
  num = Math.round(num);
  if (num === 0) return 'Zero';
  const parts = [];
  const crore = Math.floor(num / 10000000);
  const lakh = Math.floor((num % 10000000) / 100000);
  const thousand = Math.floor((num % 100000) / 1000);
  const rest = num % 1000;
  if (crore) parts.push(threeDigits(crore) + ' Crore');
  if (lakh) parts.push(twoDigits(lakh) + ' Lakh');
  if (thousand) parts.push(twoDigits(thousand) + ' Thousand');
  if (rest) parts.push(threeDigits(rest));
  return parts.join(' ');
}

function render(inv) {
  const b = inv.business || {};
  const c = inv.client || {};
  const interState = Number(inv.igst) > 0;

  const itemRows = inv.items.map((it, i) => `
    <tr>
      <td class="c">${i + 1}</td>
      <td>${esc(it.description)}<br><small>HSN/SAC: ${esc(it.hsn_code)}</small></td>
      <td class="r">${it.mrp == null ? '' : money(it.mrp)}</td>
      <td class="r">${Number(it.qty)} ${esc(it.unit)}</td>
      <td class="r">${money(it.rate)}</td>
      <td class="r">${Number(it.gst_rate)}%</td>
      <td class="r">${money(it.amount)}</td>
    </tr>`).join('');

  // HSN-wise tax summary
  const groups = {};
  for (const it of inv.items) {
    const key = (it.hsn_code || '-') + '|' + Number(it.gst_rate);
    if (!groups[key]) groups[key] = { hsn: it.hsn_code || '-', rate: Number(it.gst_rate), taxable: 0 };
    groups[key].taxable += Number(it.amount);
  }
  const hsnRows = Object.values(groups).map(g => {
    const tax = round2(g.taxable * g.rate / 100);
    return interState
      ? `<tr><td>${esc(g.hsn)}</td><td class="r">${money(g.taxable)}</td>
           <td class="r">${g.rate}%</td><td class="r">${money(tax)}</td>
           <td class="r">${money(tax)}</td></tr>`
      : `<tr><td>${esc(g.hsn)}</td><td class="r">${money(g.taxable)}</td>
           <td class="r">${g.rate / 2}%</td><td class="r">${money(tax / 2)}</td>
           <td class="r">${g.rate / 2}%</td><td class="r">${money(tax / 2)}</td>
           <td class="r">${money(tax)}</td></tr>`;
  }).join('');
  const hsnHead = interState
    ? '<tr><th>HSN/SAC</th><th>Taxable value</th><th>IGST rate</th><th>IGST amount</th><th>Total tax</th></tr>'
    : '<tr><th>HSN/SAC</th><th>Taxable value</th><th>CGST rate</th><th>CGST amount</th><th>SGST rate</th><th>SGST amount</th><th>Total tax</th></tr>';

  const taxRows = interState
    ? `<tr><td colspan="6" class="r">IGST</td><td class="r">${money(inv.igst)}</td></tr>`
    : `<tr><td colspan="6" class="r">CGST</td><td class="r">${money(inv.cgst)}</td></tr>
       <tr><td colspan="6" class="r">SGST</td><td class="r">${money(inv.sgst)}</td></tr>`;

  const totalTax = Number(inv.cgst) + Number(inv.sgst) + Number(inv.igst);

  document.getElementById('bill').innerHTML = `
    <table>
      <tr><td colspan="2" class="c"><strong>TAX INVOICE</strong></td></tr>
      <tr>
        <td style="width:55%">
          <strong>${esc(b.name)}</strong><br>
          ${esc(b.address)}<br>
          ${b.dl_no ? 'D.L. No: ' + esc(b.dl_no) + '<br>' : ''}
          GSTIN: ${esc(b.gstin)}<br>
          State: ${esc(b.state)}, Code: ${esc(b.state_code)}<br>
          ${b.cin ? 'CIN: ' + esc(b.cin) : ''}
          <hr>
          <strong>Buyer (Bill to)</strong><br>
          <strong>${esc(c.name)}</strong><br>
          ${esc(c.address)}<br>
          GSTIN: ${esc(c.gstin)}<br>
          State: ${esc(c.state)}, Code: ${esc(c.state_code)}
        </td>
        <td>
          Invoice No.: <strong>${esc(inv.invoice_no)}</strong><br>
          Dated: <strong>${fmtDate(inv.invoice_date)}</strong><br>
          ${inv.due_date ? 'Due date: ' + fmtDate(inv.due_date) + '<br>' : ''}
          Status: ${esc(inv.status)}
        </td>
      </tr>
    </table>

    <table>
      <tr>
        <th>Sl</th><th>Description of goods</th><th>MRP</th><th>Quantity</th>
        <th>Rate</th><th>GST %</th><th>Amount</th>
      </tr>
      ${itemRows}
      <tr><td colspan="6" class="r">Subtotal</td><td class="r">${money(inv.subtotal)}</td></tr>
      ${taxRows}
      <tr><td colspan="6" class="r">Round off</td><td class="r">${money(inv.round_off)}</td></tr>
      <tr><td colspan="6" class="r"><strong>Total</strong></td>
          <td class="r"><strong>&#8377; ${money(inv.total)}</strong></td></tr>
    </table>

    <table>
      <tr><td>Amount chargeable (in words):<br>
        <strong>INR ${amountInWords(Number(inv.total))} Only</strong></td></tr>
    </table>

    <table>
      ${hsnHead}
      ${hsnRows}
      <tr><td><strong>Total</strong></td><td class="r"><strong>${money(inv.subtotal)}</strong></td>
          <td colspan="${interState ? 2 : 4}" class="r"><strong>${money(totalTax)}</strong></td></tr>
    </table>

    <table>
      <tr>
        <td style="width:55%">
          ${b.fssai ? 'FSSAI No.: ' + esc(b.fssai) + '<br>' : ''}
          ${b.pan ? 'PAN: ' + esc(b.pan) + '<br>' : ''}
          <small>We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct.</small>
        </td>
        <td class="r">for <strong>${esc(b.name)}</strong><br><br><br>Authorised Signatory</td>
      </tr>
    </table>
    <p class="c"><small>This is a computer generated invoice</small></p>
  `;
}

async function init() {
  const business = await requireLogin();
  if (!business) return;
  const id = new URLSearchParams(window.location.search).get('id');
  const res = await fetch(`/api/invoices/${id}`);
  const data = await res.json();
  if (!res.ok) {
    document.getElementById('bill').textContent = data.error;
    return;
  }
  render(data);
}

init();