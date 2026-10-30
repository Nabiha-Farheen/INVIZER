require('dotenv').config();

const express = require('express');
const session = require('express-session');
const authRoutes = require('./routes/auth');
const pool = require('./db');

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}));

//console.log('authRoutes:', typeof authRoutes);

app.use('/api/auth', authRoutes);

// Clients is added 
app.use('/api/business', require('./routes/business'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/products', require('./routes/products'));
app.use('/api/layout', require('./routes/layout'));
app.use('/api/invoices', require('./routes/invoices'));
app.get('/api/test', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT 1 AS ok');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});