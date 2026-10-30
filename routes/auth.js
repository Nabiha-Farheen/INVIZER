const express = require('express');

const bcrypt = require('bcryptjs');

const pool = require('../db');

const router = express.Router();

router.post('/signup', async (req, res) => {

  try {

    const { name, login_id, password, invoice_prefix } = req.body;

    if (!name || !login_id || !password) {

      return res.status(400).json({ error: 'name, login_id and password are required' });

    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query(

      'INSERT INTO businesses (name, login_id, password_hash, invoice_prefix) VALUES (?, ?, ?, ?)',

      [name, login_id, hash, invoice_prefix || null]

    );

    res.json({ message: 'Business registered' });

  } catch (err) {

    if (err.code === 'ER_DUP_ENTRY') {

      return res.status(409).json({ error: 'login_id already taken' });

    }

    res.status(500).json({ error: err.message });

  }

});

router.post('/login', async (req, res) => {

  try {

    const { login_id, password } = req.body;

    const [rows] = await pool.query(

      'SELECT id, name, password_hash FROM businesses WHERE login_id = ?',

      [login_id]

    );

    if (rows.length === 0) return res.status(401).json({ error: 'Invalid login' });

    const ok = await bcrypt.compare(password, rows[0].password_hash);

    if (!ok) return res.status(401).json({ error: 'Invalid login' });

    req.session.businessId = rows[0].id;

    res.json({ message: 'Logged in', name: rows[0].name });

  } catch (err) {

    res.status(500).json({ error: err.message });

  }

});

router.post('/logout', (req, res) => {

  req.session.destroy(() => res.json({ message: 'Logged out' }));

});
router.get('/me', async (req, res) => {
  try {
    if (!req.session.businessId) {
      return res.status(401).json({ error: 'Not logged in' });
    }
    const [[b]] = await pool.query(
      'SELECT id, name FROM businesses WHERE id = ?', [req.session.businessId]);
    res.json(b);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
module.exports = router;