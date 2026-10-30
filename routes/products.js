const express = require('express');
const pool = require('../db');
const requireLogin = require('../middleware/requireLogin');

const router = express.Router();
router.use(requireLogin);

// LIST all products of the logged-in business
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM products WHERE business_id = ? ORDER BY name',
      [req.session.businessId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ADD a product
router.post('/', async (req, res) => {
  try {
    const { name, hsn_code, unit, mrp, rate, gst_rate } = req.body;
    if (!name || mrp == null || rate == null || gst_rate == null) {
      return res.status(400).json({ error: 'name, mrp, rate and gst_rate are required' });
    }

    const [result] = await pool.query(
      'INSERT INTO products (business_id, name, hsn_code, unit, mrp, rate, gst_rate) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [req.session.businessId, name, hsn_code || null, unit || null, mrp, rate, gst_rate]
    );
    res.json({ message: 'Product added', id: result.insertId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// EDIT a product
router.put('/:id', async (req, res) => {
  try {
    const { name, hsn_code, unit, mrp, rate, gst_rate } = req.body;
    if (!name || mrp == null || rate == null || gst_rate == null) {
      return res.status(400).json({ error: 'name, mrp, rate and gst_rate are required' });
    }

    const [result] = await pool.query(
      'UPDATE products SET name = ?, hsn_code = ?, unit = ?, mrp = ?, rate = ?, gst_rate = ? WHERE id = ? AND business_id = ?',
      [name, hsn_code || null, unit || null, mrp, rate, gst_rate, req.params.id, req.session.businessId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE a product
router.delete('/:id', async (req, res) => {
  try {
    const [result] = await pool.query(
      'DELETE FROM products WHERE id = ? AND business_id = ?',
      [req.params.id, req.session.businessId]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json({ message: 'Product deleted' });
  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(409).json({ error: "Product is used in invoices and can't be deleted" });
    }
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;