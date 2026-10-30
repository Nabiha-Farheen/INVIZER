const express = require('express');
const pool = require('../db');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();
router.use(requireLogin);

const DEFAULT_LAYOUT = {
  columns: [
    { key: 'description', label: 'Description of Goods' },
    { key: 'hsn_code', label: 'HSN/SAC' },
    { key: 'mrp', label: 'MRP' },
    { key: 'qty', label: 'Quantity' },
    { key: 'rate', label: 'Rate' },
    { key: 'unit', label: 'per' },
    { key: 'gst_rate', label: 'GST %' },
    { key: 'amount', label: 'Amount' }
  ],
  headerFields: []
};

const REQUIRED = ['description', 'qty', 'rate', 'amount'];
const KEY_RE = /^[a-z0-9_]{1,40}$/;

// Keep only valid entries, so a bad request can't save a broken layout
function clean(input) {
  const cols = (Array.isArray(input.columns) ? input.columns : []).slice(0, 15);
  const hdrs = (Array.isArray(input.headerFields) ? input.headerFields : []).slice(0, 12);

  const seen = new Set();
  const columns = [];
  for (const c of cols) {
    if (!c || !KEY_RE.test(c.key) || seen.has(c.key)) continue;
    seen.add(c.key);
    columns.push({ key: c.key, label: String(c.label || c.key).slice(0, 40) });
  }
  for (const k of REQUIRED) {
    if (!seen.has(k)) throw new Error('The layout must include the ' + k + ' column');
  }

  const hseen = new Set();
  const headerFields = [];
  for (const h of hdrs) {
    if (!h || !KEY_RE.test(h.key) || hseen.has(h.key)) continue;
    hseen.add(h.key);
    headerFields.push({ key: h.key, label: String(h.label || h.key).slice(0, 40) });
  }
  return { columns, headerFields };
}

// GET the layout (or the default if none is saved yet)
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT layout FROM templates WHERE business_id = ? ORDER BY id LIMIT 1',
      [req.session.businessId]);
    if (rows.length === 0) return res.json(DEFAULT_LAYOUT);
    const l = rows[0].layout;
    res.json(typeof l === 'string' ? JSON.parse(l) : l);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SAVE the layout
router.put('/', async (req, res) => {
  try {
    const layout = clean(req.body);
    const json = JSON.stringify(layout);
    const [rows] = await pool.query(
      'SELECT id FROM templates WHERE business_id = ? ORDER BY id LIMIT 1',
      [req.session.businessId]);
    if (rows.length === 0) {
      await pool.query(
        'INSERT INTO templates (business_id, name, layout) VALUES (?, ?, ?)',
        [req.session.businessId, 'Default', json]);
    } else {
      await pool.query('UPDATE templates SET layout = ? WHERE id = ?', [json, rows[0].id]);
    }
    res.json({ message: 'Layout saved', layout });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;