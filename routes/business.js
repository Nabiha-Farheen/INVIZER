const express = require('express');
const pool = require('../db');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();
router.use(requireLogin);

const FIELDS = ['name', 'address', 'gstin', 'state', 'state_code',
                'dl_no', 'cin', 'pan', 'fssai', 'invoice_prefix'];

// GET the logged-in business's profile
router.get('/', async (req, res) => {
  try {
    const [[b]] = await pool.query(
      `SELECT ${FIELDS.join(', ')} FROM businesses WHERE id = ?`,
      [req.session.businessId]);
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SAVE the profile
router.put('/', async (req, res) => {
  try {
    const d = req.body;
    if (!d.name) return res.status(400).json({ error: 'Business name is required' });

    const values = FIELDS.map(f => (d[f] === undefined || d[f] === '') ? null : d[f]);
    await pool.query(
      `UPDATE businesses SET ${FIELDS.map(f => f + ' = ?').join(', ')} WHERE id = ?`,
      [...values, req.session.businessId]);
    res.json({ message: 'Profile saved' });
  } catch (err) {
    if (err.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ error: 'One of the values is too long (GSTIN 15, PAN 10, CIN 21, FSSAI 14, state code 2)' });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;