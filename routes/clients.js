const express = require('express');
const pool = require('../db');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();

router.use(requireLogin);

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT c.*, COUNT(i.id) AS invoice_count
       FROM clients c
       LEFT JOIN invoices i ON i.client_id = c.id
       WHERE c.business_id = ?
       GROUP BY c.id`,
      [req.session.businessId]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
router.post('/', async (req, res) => {
  try {
    const { name, gstin, state, state_code } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Client name is required' });
    }

    const [result] = await pool.query(
      `INSERT INTO clients (business_id, name, gstin, state, state_code)
       VALUES (?, ?, ?, ?, ?)`,
      [
        req.session.businessId,
        name,
        gstin || null,
        state || null,
        state_code || null
      ]
    );

    res.json({
      message: 'Client added',
      id: result.insertId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// EDIT a client
router.put('/:id', async (req, res) => {
  try {
    const { name, address, gstin, state, state_code, phone } = req.body;
    if (!name) return res.status(400).json({ error: 'name is required' });

    const [result] = await pool.query(
      'UPDATE clients SET name = ?, address = ?, gstin = ?, state = ?, state_code = ?, phone = ? WHERE id = ? AND business_id = ?',
      [name, address || null, gstin || null, state || null, state_code || null, phone || null, req.params.id, req.session.businessId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a client
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM clients WHERE id = ? AND business_id = ?',
      [req.params.id, req.session.businessId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: "Client has invoices and can't be deleted" });
    }
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;