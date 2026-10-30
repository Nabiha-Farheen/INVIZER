const express = require('express');
const pool = require('../db');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();
router.use(requireLogin);

const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;

// Financial year runs April to March: 2026-10-01 -> "2026-27"
function getFY(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const start = m >= 4 ? y : y - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, '0')}`;
}

// CREATE an invoice
router.post('/', async (req, res) => {
  const businessId = req.session.businessId;
  const { client_id, items, template_id, due_date, extra } = req.body;
  const invoiceDate = req.body.invoice_date || new Date().toLocaleDateString('en-CA');

  if (!client_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'client_id and at least one item are required' });
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. the business and the client
    const [[business]] = await conn.query(
      'SELECT state_code, invoice_prefix FROM businesses WHERE id = ?', [businessId]);
    const [[client]] = await conn.query(
      'SELECT id, state_code FROM clients WHERE id = ? AND business_id = ?', [client_id, businessId]);
    if (!client) {
      await conn.rollback();
      return res.status(404).json({ error: 'Client not found' });
    }

    // 2. build each line from the products table
    const lines = [];
    for (const it of items) {
      const qty = Number(it.qty);
      if (!it.product_id || !(qty > 0)) throw new Error('Each item needs a product_id and qty above 0');
      const [[p]] = await conn.query(
        'SELECT * FROM products WHERE id = ? AND business_id = ?', [it.product_id, businessId]);
      if (!p) throw new Error('Product ' + it.product_id + ' not found');
      const amount = round2(qty * Number(p.rate));
      lines.push({ product: p, qty, amount, tax: round2(amount * Number(p.gst_rate) / 100) });
    }

    // 3. totals and GST
    const subtotal = round2(lines.reduce((s, l) => s + l.amount, 0));
    const totalTax = round2(lines.reduce((s, l) => s + l.tax, 0));
    const sameState = business.state_code && business.state_code === client.state_code;
    let cgst = 0, sgst = 0, igst = 0;
    if (sameState) {
      cgst = round2(totalTax / 2);
      sgst = round2(totalTax - cgst);
    } else {
      igst = totalTax;
    }
    const grand = subtotal + totalTax;
    const total = Math.round(grand);
    const roundOff = round2(total - grand);

    // 4. invoice number from the counter
    const fy = getFY(invoiceDate);
    await conn.query(
      'INSERT IGNORE INTO invoice_counters (business_id, fy, last_no) VALUES (?, ?, 0)',
      [businessId, fy]);
    const [[counter]] = await conn.query(
      'SELECT last_no FROM invoice_counters WHERE business_id = ? AND fy = ? FOR UPDATE',
      [businessId, fy]);
    const seq = counter.last_no + 1;
    await conn.query(
      'UPDATE invoice_counters SET last_no = ? WHERE business_id = ? AND fy = ?',
      [seq, businessId, fy]);
    const invoiceNo = `${business.invoice_prefix || 'INV'}/${seq}/${fy}`;

    // 5. save the invoice and its items
    const [inv] = await conn.query(
      `INSERT INTO invoices (business_id, client_id, template_id, invoice_no, fy, invoice_date, due_date,
         subtotal, cgst, sgst, igst, round_off, total, extra)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [businessId, client_id, template_id || null, invoiceNo, fy, invoiceDate, due_date || null,
       subtotal, cgst, sgst, igst, roundOff, total, extra ? JSON.stringify(extra) : null]);

    for (const l of lines) {
      const p = l.product;
      await conn.query(
        `INSERT INTO invoice_items (invoice_id, product_id, description, hsn_code, qty, unit, rate, mrp, gst_rate, amount)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [inv.insertId, p.id, p.name, p.hsn_code, l.qty, p.unit, p.rate, p.mrp, p.gst_rate, l.amount]);
    }

    await conn.commit();
    res.json({ message: 'Invoice created', id: inv.insertId, invoice_no: invoiceNo, total });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ error: err.message });
  } finally {
    conn.release();
  }
});

// VIEW one invoice with its items
// VIEW one invoice with its items, seller and buyer
router.get('/:id', async (req, res) => {
  try {
    const [[invoice]] = await pool.query(
      'SELECT * FROM invoices WHERE id = ? AND business_id = ?',
      [req.params.id, req.session.businessId]);
    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    const [items] = await pool.query(
      'SELECT * FROM invoice_items WHERE invoice_id = ? ORDER BY id', [invoice.id]);
    const [[business]] = await pool.query(
      'SELECT name, address, gstin, state, state_code, dl_no, cin, pan, fssai FROM businesses WHERE id = ?',
      [invoice.business_id]);
    const [[client]] = await pool.query(
      'SELECT name, address, gstin, state, state_code FROM clients WHERE id = ?',
      [invoice.client_id]);

    res.json({ ...invoice, items, business, client });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// LIST invoices (all, or one client with ?client_id=1)
router.get('/', async (req, res) => {
  try {
    let sql = `SELECT i.id, i.invoice_no, i.invoice_date, i.status, i.total,
                      i.client_id, c.name AS client_name
               FROM invoices i
               JOIN clients c ON c.id = i.client_id
               WHERE i.business_id = ?`;
    const params = [req.session.businessId];
    if (req.query.client_id) {
      sql += ' AND i.client_id = ?';
      params.push(req.query.client_id);
    }
    sql += ' ORDER BY i.id DESC';
    const [rows] = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CHANGE status: paid or pending
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'paid'].includes(status)) {
      return res.status(400).json({ error: 'status must be pending or paid' });
    }
    const [result] = await pool.query(
      'UPDATE invoices SET status = ? WHERE id = ? AND business_id = ?',
      [status, req.params.id, req.session.businessId]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Invoice not found' });
    }
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;