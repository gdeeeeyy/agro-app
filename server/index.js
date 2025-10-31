const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const isNeon = /neon\.tech|sslmode=require|render|railway/.test(DATABASE_URL);
const pool = new Pool({ connectionString: DATABASE_URL, ssl: isNeon ? { rejectUnauthorized: false } : undefined });

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try { await pool.query('select 1'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false }); }
});

// Helpers
async function one(sql, params) { const { rows } = await pool.query(sql, params); return rows[0] || null; }
async function all(sql, params) { const { rows } = await pool.query(sql, params); return rows; }

// Auth (client sends SHA-256 hash to match app)
app.post('/auth/signup', async (req, res) => {
  const { number, password, full_name } = req.body || {};
  try {
    const u = await one(
      'INSERT INTO users (number, password, full_name, is_admin) VALUES ($1, $2, $3, 0) RETURNING id, number, full_name, is_admin, created_at',
      [number, password, full_name || null]
    );
    res.json(u);
  } catch (e) {
    if (String(e.message).toLowerCase().includes('unique')) return res.status(400).json({ error: 'number already exists' });
    console.error(e); res.status(500).json({ error: 'signup failed' });
  }
});

app.post('/auth/signin', async (req, res) => {
  const { number, password } = req.body || {};
  const u = await one('SELECT id, number, full_name, is_admin, created_at FROM users WHERE number=$1 AND password=$2', [number, password]);
  if (!u) return res.status(401).json({ error: 'Invalid number or password' });
  res.json(u);
});

// Create admin (server-side)
app.post('/auth/create-admin', async (req, res) => {
  const { number, password, full_name } = req.body || {};
  try {
    const u = await one(
      'INSERT INTO users (number, password, full_name, is_admin) VALUES ($1, $2, $3, 1) RETURNING id, number, full_name, is_admin, created_at',
      [number, password, full_name || null]
    );
    res.json(u);
  } catch (e) {
    if (String(e.message).toLowerCase().includes('unique')) return res.status(400).json({ error: 'number already exists' });
    console.error(e); res.status(500).json({ error: 'create-admin failed' });
  }
});

// Products
app.get('/products', async (req, res) => {
  res.json(await all('SELECT * FROM products ORDER BY created_at DESC'));
});

app.get('/products/:id', async (req, res) => {
  const r = await one('SELECT * FROM products WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(r);
});

app.get('/products/search', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const like = `%${q}%`;
  res.json(await all(
    `SELECT * FROM products WHERE 
      lower(name) LIKE $1 OR lower(plant_used) LIKE $1 OR lower(keywords) LIKE $1 OR lower(details) LIKE $1 OR
      lower(name_ta) LIKE $1 OR lower(plant_used_ta) LIKE $1 OR lower(details_ta) LIKE $1
     ORDER BY created_at DESC`, [like]
  ));
});

app.get('/products/by-keyword', async (req, res) => {
  const like = `%${String(req.query.name || '').toLowerCase()}%`;
  res.json(await all('SELECT * FROM products WHERE lower(keywords) LIKE $1 ORDER BY created_at DESC', [like]));
});

app.post('/products', async (req, res) => {
  const p = req.body || {};
  const r = await one(
    `INSERT INTO products (name, plant_used, keywords, details, name_ta, plant_used_ta, details_ta, image, stock_available, cost_per_unit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [p.name, p.plant_used, p.keywords, p.details, p.name_ta ?? null, p.plant_used_ta ?? null, p.details_ta ?? null, p.image ?? null, p.stock_available, p.cost_per_unit]
  );
  res.json(r);
});

app.patch('/products/:id', async (req, res) => {
  const allowed = ['name','plant_used','keywords','details','name_ta','plant_used_ta','details_ta','image','stock_available','cost_per_unit'];
  const set = []; const vals = []; let i = 1;
  for (const k of allowed) if (k in req.body) { set.push(`${k}=$${i++}`); vals.push(req.body[k]); }
  if (!set.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE products SET ${set.join(', ')}, updated_at = now() WHERE id = $${i}`, vals);
  res.json({ ok: true });
});

app.delete('/products/:id', async (req, res) => {
  await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Keywords
app.get('/keywords', async (req, res) => {
  res.json(await all('SELECT * FROM keywords ORDER BY name ASC'));
});

app.post('/keywords', async (req, res) => {
  try {
    const r = await one('INSERT INTO keywords (name) VALUES ($1) RETURNING id', [String(req.body?.name || '').toLowerCase().trim()]);
    res.json(r);
  } catch (e) {
    if (String(e.message).toLowerCase().includes('unique')) return res.status(400).json({ error: 'exists' });
    throw e;
  }
});

app.delete('/keywords/:id', async (req, res) => {
  await pool.query('DELETE FROM keywords WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Cart
app.get('/cart', async (req, res) => {
  const userId = Number(req.query.userId);
  res.json(await all(
    `SELECT ci.*, p.name, p.name_ta, p.image, p.cost_per_unit, p.stock_available
     FROM cart_items ci JOIN products p ON ci.product_id = p.id
     WHERE ci.user_id = $1 ORDER BY ci.created_at DESC`, [userId]
  ));
});

app.post('/cart/add', async (req, res) => {
  const { userId, productId, quantity } = req.body || {};
  const ex = await one('SELECT 1 FROM cart_items WHERE user_id=$1 AND product_id=$2', [userId, productId]);
  if (ex) await pool.query('UPDATE cart_items SET quantity = quantity + $1 WHERE user_id=$2 AND product_id=$3', [quantity || 1, userId, productId]);
  else await pool.query('INSERT INTO cart_items (user_id, product_id, quantity) VALUES ($1,$2,$3)', [userId, productId, quantity || 1]);
  res.json({ ok: true });
});

app.patch('/cart/item', async (req, res) => {
  const { userId, productId, quantity } = req.body || {};
  if (quantity <= 0) await pool.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2', [userId, productId]);
  else await pool.query('UPDATE cart_items SET quantity=$1 WHERE user_id=$2 AND product_id=$3', [quantity, userId, productId]);
  res.json({ ok: true });
});

app.delete('/cart/item', async (req, res) => {
  const { userId, productId } = req.body || {};
  await pool.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2', [userId, productId]);
  res.json({ ok: true });
});

app.delete('/cart/clear', async (req, res) => {
  const userId = Number(req.query.userId);
  await pool.query('DELETE FROM cart_items WHERE user_id=$1', [userId]);
  res.json({ ok: true });
});

app.get('/cart/total', async (req, res) => {
  const userId = Number(req.query.userId);
  const r = await one(
    `SELECT COALESCE(SUM(ci.quantity * p.cost_per_unit),0) as total
     FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1`, [userId]
  );
  res.json(r || { total: 0 });
});

// Orders
app.post('/orders', async (req, res) => {
  const { userId, paymentMethod, deliveryAddress, note } = req.body || {};
  const cartItems = await all(
    `SELECT ci.product_id, ci.quantity, p.name, p.cost_per_unit
     FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1`, [userId]
  );
  if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });
  const total = (await one(
    `SELECT COALESCE(SUM(ci.quantity * p.cost_per_unit),0) as total
     FROM cart_items ci JOIN products p ON ci.product_id = p.id WHERE ci.user_id = $1`, [userId]
  )).total || 0;
  const o = await one(
    'INSERT INTO orders (user_id, total_amount, payment_method, delivery_address, status, status_note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [userId, total, paymentMethod, deliveryAddress || null, 'pending', note || null]
  );
  for (const it of cartItems) {
    await pool.query(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, price_per_unit) VALUES ($1,$2,$3,$4,$5)',
      [o.id, it.product_id, it.name, it.quantity, it.cost_per_unit]
    );
    await pool.query('UPDATE products SET stock_available = stock_available - $1 WHERE id=$2', [it.quantity, it.product_id]);
  }
  await pool.query('DELETE FROM cart_items WHERE user_id=$1', [userId]);
  res.json({ id: o.id });
});

app.get('/orders', async (req, res) => {
  const userId = Number(req.query.userId);
  res.json(await all('SELECT * FROM orders WHERE user_id=$1 ORDER BY created_at DESC', [userId]));
});

app.get('/orders/:id/items', async (req, res) => {
  res.json(await all('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id', [req.params.id]));
});

app.get('/orders/all', async (req, res) => {
  res.json(await all('SELECT o.*, u.full_name, u.number FROM orders o JOIN users u ON o.user_id=u.id ORDER BY o.created_at DESC'));
});

app.patch('/orders/:id', async (req, res) => {
  const { status, statusNote, deliveryDate } = req.body || {};
  const set = ['status=$1','updated_at=now()']; const vals=[status]; let i=2;
  if (statusNote !== undefined) { set.push(`status_note=$${i++}`); vals.push(statusNote); }
  if (deliveryDate !== undefined) { set.push(`delivery_date=$${i++}`); vals.push(deliveryDate); }
  vals.push(req.params.id);
  await pool.query(`UPDATE orders SET ${set.join(', ')} WHERE id=$${i}`, vals);
  res.json({ ok: true });
});

app.delete('/orders/:id', async (req, res) => {
  await pool.query('DELETE FROM orders WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`API listening on :${PORT}`));
