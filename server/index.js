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

// Ensure runtime migrations (idempotent)
let isReady = false;
async function runMigrations() {
  try {
    // Columns that might be missing on older deploys
    await pool.query("ALTER TABLE products ADD COLUMN IF NOT EXISTS unit TEXT");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS logistics_name TEXT");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number TEXT");
    await pool.query("ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_url TEXT");

    // Core tables required by API (subset; IF NOT EXISTS keeps this idempotent)
    await pool.query(`CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      number TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT,
      address TEXT,
      is_admin INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS products (
      id BIGSERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      plant_used TEXT NOT NULL,
      keywords TEXT NOT NULL,
      details TEXT NOT NULL,
      name_ta TEXT,
      plant_used_ta TEXT,
      details_ta TEXT,
      image TEXT,
      unit TEXT,
      stock_available INTEGER DEFAULT 0,
      cost_per_unit DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS keywords (
      id BIGSERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS crops (
      id BIGSERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      name_ta TEXT,
      image TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);
    // Seed default crops if missing (idempotent)
    await pool.query(`
      INSERT INTO crops (name, name_ta)
      SELECT 'Tomato', 'தக்காளி'
      WHERE NOT EXISTS (SELECT 1 FROM crops WHERE lower(name) = 'tomato')
    `);
    await pool.query(`
      INSERT INTO crops (name, name_ta)
      SELECT 'Brinjal', 'கத்தரிக்காய்'
      WHERE NOT EXISTS (
        SELECT 1 FROM crops WHERE lower(name) IN ('brinjal','eggplant','aubergine')
      )
    `);

    await pool.query(`CREATE TABLE IF NOT EXISTS crop_guides (
      id BIGSERIAL PRIMARY KEY,
      crop_id BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
      language TEXT NOT NULL DEFAULT 'en',
      cultivation_guide TEXT,
      pest_management TEXT,
      disease_management TEXT,
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(crop_id, language)
    )`);

    // Missing tables causing 42P01 errors on Render
    await pool.query(`CREATE TABLE IF NOT EXISTS crop_pests (
      id BIGSERIAL PRIMARY KEY,
      crop_id BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
      language TEXT NOT NULL DEFAULT 'en',
      name TEXT NOT NULL,
      description TEXT,
      management TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(crop_id, language, name)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS crop_pest_images (
      id BIGSERIAL PRIMARY KEY,
      pest_id BIGINT NOT NULL REFERENCES crop_pests(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      caption TEXT,
      caption_ta TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);
    await pool.query("ALTER TABLE crop_pest_images ADD COLUMN IF NOT EXISTS caption_ta TEXT");

    await pool.query(`CREATE TABLE IF NOT EXISTS crop_diseases (
      id BIGSERIAL PRIMARY KEY,
      crop_id BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
      language TEXT NOT NULL DEFAULT 'en',
      name TEXT NOT NULL,
      description TEXT,
      management TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(crop_id, language, name)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS crop_disease_images (
      id BIGSERIAL PRIMARY KEY,
      disease_id BIGINT NOT NULL REFERENCES crop_diseases(id) ON DELETE CASCADE,
      image_url TEXT NOT NULL,
      caption TEXT,
      caption_ta TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    // Simplify bilingual columns (one row per pest/disease with EN+TA fields)
    await pool.query("ALTER TABLE crop_pests ADD COLUMN IF NOT EXISTS name_ta TEXT");
    await pool.query("ALTER TABLE crop_pests ADD COLUMN IF NOT EXISTS description_ta TEXT");
    await pool.query("ALTER TABLE crop_pests ADD COLUMN IF NOT EXISTS management_ta TEXT");
    await pool.query("ALTER TABLE crop_diseases ADD COLUMN IF NOT EXISTS name_ta TEXT");
    await pool.query("ALTER TABLE crop_diseases ADD COLUMN IF NOT EXISTS description_ta TEXT");
    await pool.query("ALTER TABLE crop_diseases ADD COLUMN IF NOT EXISTS management_ta TEXT");
    await pool.query("ALTER TABLE crop_guides ADD COLUMN IF NOT EXISTS cultivation_guide_ta TEXT");
    await pool.query("ALTER TABLE crop_guides ADD COLUMN IF NOT EXISTS pest_management_ta TEXT");
    await pool.query("ALTER TABLE crop_guides ADD COLUMN IF NOT EXISTS disease_management_ta TEXT");
    await pool.query("ALTER TABLE crop_disease_images ADD COLUMN IF NOT EXISTS caption_ta TEXT");

    await pool.query(`CREATE TABLE IF NOT EXISTS cart_items (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      quantity INTEGER NOT NULL DEFAULT 1,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(user_id, product_id)
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS orders (
      id BIGSERIAL PRIMARY KEY,
      user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      total_amount DOUBLE PRECISION NOT NULL,
      payment_method TEXT NOT NULL,
      delivery_address TEXT,
      status TEXT DEFAULT 'pending',
      status_note TEXT,
      delivery_date TEXT,
      logistics_name TEXT,
      tracking_number TEXT,
      tracking_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    )`);

    await pool.query(`CREATE TABLE IF NOT EXISTS order_items (
      id BIGSERIAL PRIMARY KEY,
      order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
      product_id BIGINT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price_per_unit DOUBLE PRECISION NOT NULL,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    // In-app notifications (system or per-user)
    await pool.query(`CREATE TABLE IF NOT EXISTS notifications (
      id BIGSERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      user_id BIGINT NULL REFERENCES users(id) ON DELETE CASCADE,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    // Logistics carriers (for shipping/tracking)
    await pool.query(`CREATE TABLE IF NOT EXISTS logistics (
      id BIGSERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      tracking_url TEXT,
      created_at TIMESTAMPTZ DEFAULT now()
    )`);

    // scan_plants table for mobile Scanner Plants
    await pool.query(`CREATE TABLE IF NOT EXISTS scan_plants (
      id BIGSERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      name_ta TEXT
    )`);
    // Product variants
    await pool.query(`CREATE TABLE IF NOT EXISTS product_variants (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      price DOUBLE PRECISION NOT NULL,
      stock_available INTEGER DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(product_id, label)
    )`);
    // Backfill columns for existing installations
    await pool.query("ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS label TEXT");
    await pool.query("ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS price DOUBLE PRECISION");
    await pool.query("ALTER TABLE product_variants ADD COLUMN IF NOT EXISTS stock_available INTEGER DEFAULT 0");

    // Cart variants support
    await pool.query(`ALTER TABLE cart_items ADD COLUMN IF NOT EXISTS variant_id BIGINT REFERENCES product_variants(id)`);
    // adjust unique to (user, product, variant)
    try { await pool.query('ALTER TABLE cart_items DROP CONSTRAINT IF EXISTS cart_items_user_id_product_id_key'); } catch {}
    await pool.query('DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = \'cart_items_user_product_variant_unique\') THEN ALTER TABLE cart_items ADD CONSTRAINT cart_items_user_product_variant_unique UNIQUE (user_id, product_id, variant_id); END IF; END $$;');

    // Order items capture variant
    await pool.query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id BIGINT');
    await pool.query('ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label TEXT');
  } catch (e) {
    console.warn('Startup migration warning:', e.message);
  } finally {
    isReady = true;
  }
}
runMigrations();

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  try { await pool.query('select 1'); res.json({ ok: true }); } catch (e) { res.status(500).json({ ok: false }); }
});

// Block writes until migrations are done (reads allowed to avoid 503s on initial load)
app.use((req, res, next) => {
  if (!isReady && req.method !== 'GET' && req.path !== '/health') {
    return res.status(503).json({ error: 'starting' });
  }
  next();
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
  const { number, password, full_name, is_admin } = req.body || {};
  const role = [1,2].includes(Number(is_admin)) ? Number(is_admin) : 1;
  try {
    const u = await one(
      'INSERT INTO users (number, password, full_name, is_admin) VALUES ($1, $2, $3, $4) RETURNING id, number, full_name, is_admin, created_at',
      [number, password, full_name || null, role]
    );
    res.json(u);
  } catch (e) {
    if (String(e.message).toLowerCase().includes('unique')) return res.status(400).json({ error: 'number already exists' });
    console.error(e); res.status(500).json({ error: 'create-admin failed' });
  }
});

// Users (address update)
app.patch('/users/:id', async (req, res) => {
  const { address, full_name, is_admin } = req.body || {};
  const set = []; const vals=[]; let i=1;
  if (address !== undefined) { set.push(`address=$${i++}`); vals.push(address); }
  if (full_name !== undefined) { set.push(`full_name=$${i++}`); vals.push(full_name); }
  // Role change with last-master guard
  let roleToSet = null;
  if (is_admin !== undefined) {
    const role = [0,1,2].includes(Number(is_admin)) ? Number(is_admin) : null;
    if (role !== null) {
      // If demoting a master, ensure at least one master remains
      const current = await one('SELECT is_admin FROM users WHERE id=$1', [req.params.id]);
      if (current && Number(current.is_admin) === 2 && role !== 2) {
        const mc = await one('SELECT COUNT(*)::int AS c FROM users WHERE is_admin=2');
        if (mc && mc.c <= 1) {
          return res.status(400).json({ error: 'cannot demote the last master admin' });
        }
      }
      roleToSet = role;
      set.push(`is_admin=$${i++}`); vals.push(role);
    }
  }
  if (!set.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE users SET ${set.join(', ')}, created_at=created_at WHERE id=$${i}`, vals);
  const u = await one('SELECT id, number, full_name, is_admin, created_at, address FROM users WHERE id=$1', [req.params.id]);
  res.json(u);
});

// Admins
app.get('/admins', async (req, res) => {
  const rows = await all('SELECT id, number, full_name, is_admin FROM users WHERE is_admin > 0 ORDER BY created_at ASC');
  res.json(rows);
});

app.delete('/admins/:id', async (req, res) => {
  const u = await one('SELECT is_admin FROM users WHERE id=$1', [req.params.id]);
  if (u && Number(u.is_admin) === 2) {
    const mc = await one('SELECT COUNT(*)::int AS c FROM users WHERE is_admin=2');
    if (mc && mc.c <= 1) return res.status(400).json({ error: 'cannot delete the last master admin' });
  }
  await pool.query('DELETE FROM users WHERE id=$1 AND is_admin > 0', [req.params.id]);
  res.json({ ok: true });
});

// Products
app.get('/products', async (req, res) => {
  res.json(await all(`
    SELECT p.*,
           (SELECT MIN(price) FROM product_variants v WHERE v.product_id = p.id) AS min_price,
           (SELECT label FROM product_variants v2 WHERE v2.product_id = p.id ORDER BY price ASC LIMIT 1) AS min_label
    FROM products p
    ORDER BY p.created_at DESC`));
});

// Place search routes BEFORE ":id" to avoid route shadowing
app.get('/products/search', async (req, res) => {
  const q = String(req.query.q || '').toLowerCase();
  const like = `%${q}%`;
  res.json(await all(
    `SELECT p.*,
            (SELECT MIN(price) FROM product_variants v WHERE v.product_id = p.id) AS min_price,
            (SELECT label FROM product_variants v2 WHERE v2.product_id = p.id ORDER BY price ASC LIMIT 1) AS min_label
     FROM products p WHERE 
      lower(p.name) LIKE $1 OR lower(p.plant_used) LIKE $1 OR lower(p.keywords) LIKE $1 OR lower(p.details) LIKE $1 OR
      lower(p.name_ta) LIKE $1 OR lower(p.plant_used_ta) LIKE $1 OR lower(p.details_ta) LIKE $1
     ORDER BY p.created_at DESC`, [like]
  ));
});

app.get('/products/by-keyword', async (req, res) => {
  const like = `%${String(req.query.name || '').toLowerCase()}%`;
  res.json(await all(`
    SELECT p.*,
           (SELECT MIN(price) FROM product_variants v WHERE v.product_id = p.id) AS min_price,
           (SELECT label FROM product_variants v2 WHERE v2.product_id = p.id ORDER BY price ASC LIMIT 1) AS min_label
    FROM products p
    WHERE lower(p.keywords) LIKE $1
    ORDER BY p.created_at DESC`, [like]));
});

app.get('/products/:id', async (req, res) => {
  const r = await one('SELECT * FROM products WHERE id=$1', [req.params.id]);
  if (!r) return res.status(404).json({ error: 'not found' });
  res.json(r);
});

app.post('/products', async (req, res) => {
  const p = req.body || {};
  const r = await one(
    `INSERT INTO products (name, plant_used, keywords, details, name_ta, plant_used_ta, details_ta, image, unit, stock_available, cost_per_unit)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [p.name, p.plant_used, p.keywords, p.details, p.name_ta ?? null, p.plant_used_ta ?? null, p.details_ta ?? null, p.image ?? null, p.unit ?? null, Number(p.stock_available || 0), Number(p.cost_per_unit || 0)]
  );
  res.json(r);
});

app.patch('/products/:id', async (req, res) => {
  const allowed = ['name','plant_used','keywords','details','name_ta','plant_used_ta','details_ta','image','unit','stock_available','cost_per_unit'];
  const set = []; const vals = []; let i = 1;
  for (const k of allowed) if (k in req.body) { set.push(`${k}=$${i++}`); vals.push(req.body[k]); }
  if (!set.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE products SET ${set.join(', ')}, updated_at = now() WHERE id = $${i}`, vals);
  res.json({ ok: true });
});

app.delete('/products/:id', async (req, res) => {
  // Prevent deleting a product that appears in order_items (preserve order history integrity)
  const ref = await one('SELECT 1 FROM order_items WHERE product_id=$1 LIMIT 1', [req.params.id]);
  if (ref) return res.status(400).json({ error: 'cannot delete product with order history' });
  await pool.query('DELETE FROM products WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Variants
app.get('/products/:id/variants', async (req, res) => {
  const rows = await all('SELECT id, product_id, label, price, stock_available FROM product_variants WHERE product_id=$1 ORDER BY price ASC', [req.params.id]);
  res.json(rows);
});
app.post('/products/:id/variants', async (req, res) => {
  const { label, price, stock_available } = req.body || {};
  const v = await one(`
    INSERT INTO product_variants (product_id, label, price, stock_available)
    VALUES ($1,$2,$3,$4)
    ON CONFLICT (product_id, label)
    DO UPDATE SET price=EXCLUDED.price, stock_available=EXCLUDED.stock_available, updated_at=now()
    RETURNING id`, [req.params.id, label, Number(price), Number(stock_available||0)]);
  res.json(v);
});
app.patch('/variants/:id', async (req, res) => {
  const allowed = ['label','price','stock_available']; const set=[]; const vals=[]; let i=1;
  for (const k of allowed) if (k in req.body) { set.push(`${k}=$${i++}`); vals.push(req.body[k]); }
  if (!set.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE product_variants SET ${set.join(', ')}, updated_at=now() WHERE id=$${i}` , vals);
  res.json({ ok: true });
});
app.delete('/variants/:id', async (req, res) => {
  await pool.query('DELETE FROM product_variants WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Keywords
app.get('/keywords', async (req, res) => {
  res.json(await all('SELECT * FROM keywords ORDER BY name ASC'));
});

// Crops
app.get('/crops', async (req, res) => {
  res.json(await all('SELECT * FROM crops ORDER BY name ASC'));
});

app.post('/crops', async (req, res) => {
  const { name, name_ta, image } = req.body || {};
  try {
    const r = await one('INSERT INTO crops (name, name_ta, image) VALUES ($1,$2,$3) RETURNING id', [name, name_ta || null, image || null]);
    res.json(r);
  } catch (e) {
    if (String(e.message).toLowerCase().includes('unique')) return res.status(400).json({ error: 'exists' });
    console.error(e); res.status(500).json({ error: 'create crop failed' });
  }
});

app.patch('/crops/:id', async (req, res) => {
  const allowed = ['name','name_ta','image']; const set=[]; const vals=[]; let i=1;
  for (const k of allowed) if (k in req.body) { set.push(`${k}=$${i++}`); vals.push(req.body[k]); }
  if (!set.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE crops SET ${set.join(', ')}, updated_at=now() WHERE id=$${i}`, vals);
  res.json({ ok: true });
});

app.delete('/crops/:id', async (req, res) => {
  await pool.query('DELETE FROM crops WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Crop guides
app.get('/crops/:id/guide', async (req, res) => {
  const lang = String(req.query.lang || 'en');
  const g = await one('SELECT * FROM crop_guides WHERE crop_id=$1 AND language=$2', [req.params.id, lang]);
  // Return bilingual data regardless of requested lang
  const pests = await all('SELECT id, crop_id, name, name_ta, description, description_ta, management, management_ta FROM crop_pests WHERE crop_id=$1 ORDER BY name ASC', [req.params.id]);
  const diseases = await all('SELECT id, crop_id, name, name_ta, description, description_ta, management, management_ta FROM crop_diseases WHERE crop_id=$1 ORDER BY name ASC', [req.params.id]);

  // Attach images for each pest/disease
  const pestIds = pests.map(p => p.id);
  const diseaseIds = diseases.map(d => d.id);
  const pestImages = pestIds.length ? await all('SELECT * FROM crop_pest_images WHERE pest_id = ANY($1::bigint[]) ORDER BY id', [pestIds]) : [];
  const diseaseImages = diseaseIds.length ? await all('SELECT * FROM crop_disease_images WHERE disease_id = ANY($1::bigint[]) ORDER BY id', [diseaseIds]) : [];
  const imgsByPest = pestImages.reduce((m, r) => { (m[r.pest_id] ||= []).push({ id: r.id, image: r.image_url, caption: r.caption, caption_ta: r.caption_ta }); return m; }, {});
  const imgsByDisease = diseaseImages.reduce((m, r) => { (m[r.disease_id] ||= []).push({ id: r.id, image: r.image_url, caption: r.caption, caption_ta: r.caption_ta }); return m; }, {});
  const pestsWithImages = pests.map(p => ({ ...p, images: imgsByPest[p.id] || [] }));
  const diseasesWithImages = diseases.map(d => ({ ...d, images: imgsByDisease[d.id] || [] }));

  res.json({ guide: g || { crop_id: Number(req.params.id), language: lang }, pests: pestsWithImages, diseases: diseasesWithImages });
});

app.put('/crops/:id/guide', async (req, res) => {
  const { language, cultivation_guide, pest_management, disease_management } = req.body || {};
  const lang = language || 'en';
  await pool.query(
    `INSERT INTO crop_guides (crop_id, language, cultivation_guide, pest_management, disease_management)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (crop_id, language)
     DO UPDATE SET cultivation_guide=EXCLUDED.cultivation_guide, pest_management=EXCLUDED.pest_management, disease_management=EXCLUDED.disease_management, updated_at=now()`,
    [req.params.id, lang, cultivation_guide || null, pest_management || null, disease_management || null]
  );
  res.json({ ok: true });
});

// Pests
app.get('/crops/:id/pests', async (req, res) => {
  res.json(await all('SELECT id, crop_id, name, name_ta, description, description_ta, management, management_ta FROM crop_pests WHERE crop_id=$1 ORDER BY name ASC', [req.params.id]));
});
app.post('/crops/:id/pests', async (req, res) => {
  // Legacy: single-language insert (kept for compatibility)
  const { language, name, description, management } = req.body || {};
  const lang = (language || 'en').toLowerCase();
  if (lang === 'ta') {
    const r = await one('INSERT INTO crop_pests (crop_id, language, name_ta, description_ta, management_ta) VALUES ($1,$2,$3,$4,$5) RETURNING id', [req.params.id, 'ta', name, description || null, management || null]);
    return res.json(r);
  }
  const r = await one('INSERT INTO crop_pests (crop_id, language, name, description, management) VALUES ($1,$2,$3,$4,$5) RETURNING id', [req.params.id, 'en', name, description || null, management || null]);
  res.json(r);
});
app.post('/crops/:id/pests-both', async (req, res) => {
  const { name_en, name_ta, description_en, description_ta, management_en, management_ta } = req.body || {};
  const nameUnique = String((name_en || name_ta || '')).trim();
  if (!nameUnique) return res.status(400).json({ error: 'name required' });
  const r = await one(
    `INSERT INTO crop_pests (crop_id, language, name, name_ta, description, description_ta, management, management_ta)
     VALUES ($1,'en',$2,$3,$4,$5,$6,$7)
     ON CONFLICT (crop_id, language, name)
     DO UPDATE SET 
       name_ta = COALESCE(EXCLUDED.name_ta, crop_pests.name_ta),
       description = COALESCE(EXCLUDED.description, crop_pests.description),
       description_ta = COALESCE(EXCLUDED.description_ta, crop_pests.description_ta),
       management = COALESCE(EXCLUDED.management, crop_pests.management),
       management_ta = COALESCE(EXCLUDED.management_ta, crop_pests.management_ta)
     RETURNING id`,
    [req.params.id, nameUnique, name_ta || null, description_en || null, description_ta || null, management_en || null, management_ta || null]
  );
  res.json(r);
});
app.post('/pests/:id/images', async (req, res) => {
  const { image, caption, caption_ta } = req.body || {};
  const r = await one('INSERT INTO crop_pest_images (pest_id, image_url, caption, caption_ta) VALUES ($1,$2,$3,$4) RETURNING id', [req.params.id, image, caption || null, caption_ta || null]);
  res.json(r);
});
app.get('/pests/:id/images', async (req, res) => {
  res.json(await all('SELECT id, image_url as image, caption, caption_ta FROM crop_pest_images WHERE pest_id=$1 ORDER BY id', [req.params.id]));
});

// Diseases
app.get('/crops/:id/diseases', async (req, res) => {
  res.json(await all('SELECT id, crop_id, name, name_ta, description, description_ta, management, management_ta FROM crop_diseases WHERE crop_id=$1 ORDER BY name ASC', [req.params.id]));
});
app.post('/crops/:id/diseases', async (req, res) => {
  // Legacy single-language insert
  const { language, name, description, management } = req.body || {};
  const lang = (language || 'en').toLowerCase();
  if (lang === 'ta') {
    const r = await one('INSERT INTO crop_diseases (crop_id, language, name_ta, description_ta, management_ta) VALUES ($1,$2,$3,$4,$5) RETURNING id', [req.params.id, 'ta', name, description || null, management || null]);
    return res.json(r);
  }
  const r = await one('INSERT INTO crop_diseases (crop_id, language, name, description, management) VALUES ($1,$2,$3,$4,$5) RETURNING id', [req.params.id, 'en', name, description || null, management || null]);
  res.json(r);
});
app.post('/crops/:id/diseases-both', async (req, res) => {
  const { name_en, name_ta, description_en, description_ta, management_en, management_ta } = req.body || {};
  const nameUnique = String((name_en || name_ta || '')).trim();
  if (!nameUnique) return res.status(400).json({ error: 'name required' });
  const r = await one(
    `INSERT INTO crop_diseases (crop_id, language, name, name_ta, description, description_ta, management, management_ta)
     VALUES ($1,'en',$2,$3,$4,$5,$6,$7)
     ON CONFLICT (crop_id, language, name)
     DO UPDATE SET 
       name_ta = COALESCE(EXCLUDED.name_ta, crop_diseases.name_ta),
       description = COALESCE(EXCLUDED.description, crop_diseases.description),
       description_ta = COALESCE(EXCLUDED.description_ta, crop_diseases.description_ta),
       management = COALESCE(EXCLUDED.management, crop_diseases.management),
       management_ta = COALESCE(EXCLUDED.management_ta, crop_diseases.management_ta)
     RETURNING id`,
    [req.params.id, nameUnique, name_ta || null, description_en || null, description_ta || null, management_en || null, management_ta || null]
  );
  res.json(r);
});
app.post('/diseases/:id/images', async (req, res) => {
  const { image, caption, caption_ta } = req.body || {};
  const r = await one('INSERT INTO crop_disease_images (disease_id, image_url, caption, caption_ta) VALUES ($1,$2,$3,$4) RETURNING id', [req.params.id, image, caption || null, caption_ta || null]);
  res.json(r);
});
app.get('/diseases/:id/images', async (req, res) => {
  res.json(await all('SELECT id, image_url as image, caption, caption_ta FROM crop_disease_images WHERE disease_id=$1 ORDER BY id', [req.params.id]));
});

// Update pest/disease (for Masters management)
app.patch('/pests/:id', async (req, res) => {
  const allowed = ['name','name_ta','description','description_ta','management','management_ta'];
  const set=[]; const vals=[]; let i=1;
  for (const k of allowed) if (k in req.body) { set.push(`${k}=$${i++}`); vals.push(req.body[k]); }
  if (!set.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE crop_pests SET ${set.join(', ')}, updated_at=now() WHERE id=$${i}`, vals);
  res.json({ ok: true });
});
app.patch('/diseases/:id', async (req, res) => {
  const allowed = ['name','name_ta','description','description_ta','management','management_ta'];
  const set=[]; const vals=[]; let i=1;
  for (const k of allowed) if (k in req.body) { set.push(`${k}=$${i++}`); vals.push(req.body[k]); }
  if (!set.length) return res.json({ ok: true });
  vals.push(req.params.id);
  await pool.query(`UPDATE crop_diseases SET ${set.join(', ')}, updated_at=now() WHERE id=$${i}`, vals);
  res.json({ ok: true });
});

// Delete pest/disease (for Masters management)
app.delete('/pests/:id', async (req, res) => {
  await pool.query('DELETE FROM crop_pests WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});
app.delete('/diseases/:id', async (req, res) => {
  await pool.query('DELETE FROM crop_diseases WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
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

// Scanner plants
app.get('/scan-plants', async (req, res) => {
  res.json(await all('SELECT * FROM scan_plants ORDER BY name ASC'));
});
app.post('/scan-plants', async (req, res) => {
  const { name, name_ta } = req.body || {};
  try {
    const r = await one('INSERT INTO scan_plants (name, name_ta) VALUES ($1,$2) RETURNING id', [String(name).trim(), name_ta || null]);
    res.json(r);
  } catch (e) {
    if (String(e.message).toLowerCase().includes('unique')) return res.status(400).json({ error: 'exists' });
    console.error(e); res.status(500).json({ error: 'failed' });
  }
});
app.delete('/scan-plants/:id', async (req, res) => {
  await pool.query('DELETE FROM scan_plants WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

// Cart
app.get('/cart', async (req, res) => {
  const userId = Number(req.query.userId);
  res.json(await all(
    `SELECT ci.*, p.name, p.name_ta, p.image,
            COALESCE(v.price, p.cost_per_unit) as cost_per_unit,
            COALESCE(v.label, NULL) as variant_label,
            v.id AS variant_id
     FROM cart_items ci
     JOIN products p ON ci.product_id = p.id
     LEFT JOIN product_variants v ON ci.variant_id = v.id
     WHERE ci.user_id = $1 ORDER BY ci.created_at DESC`, [userId]
  ));
});

app.post('/cart/add', async (req, res) => {
  const { userId, productId, quantity, variantId } = req.body || {};
  const ex = await one('SELECT 1 FROM cart_items WHERE user_id=$1 AND product_id=$2 AND (variant_id IS NOT DISTINCT FROM $3)', [userId, productId, variantId || null]);
  if (ex) await pool.query('UPDATE cart_items SET quantity = quantity + $1 WHERE user_id=$2 AND product_id=$3 AND (variant_id IS NOT DISTINCT FROM $4)', [quantity || 1, userId, productId, variantId || null]);
  else await pool.query('INSERT INTO cart_items (user_id, product_id, quantity, variant_id) VALUES ($1,$2,$3,$4)', [userId, productId, quantity || 1, variantId || null]);
  res.json({ ok: true });
});

app.patch('/cart/item', async (req, res) => {
  const { userId, productId, quantity, variantId } = req.body || {};
  if (quantity <= 0) await pool.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2 AND (variant_id IS NOT DISTINCT FROM $3)', [userId, productId, variantId || null]);
  else await pool.query('UPDATE cart_items SET quantity=$1 WHERE user_id=$2 AND product_id=$3 AND (variant_id IS NOT DISTINCT FROM $4)', [quantity, userId, productId, variantId || null]);
  res.json({ ok: true });
});

app.delete('/cart/item', async (req, res) => {
  const { userId, productId, variantId } = req.body || {};
  await pool.query('DELETE FROM cart_items WHERE user_id=$1 AND product_id=$2 AND (variant_id IS NOT DISTINCT FROM $3)', [userId, productId, variantId || null]);
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
    `SELECT ci.product_id, ci.variant_id, ci.quantity, p.name,
            COALESCE(v.price, p.cost_per_unit) as price,
            v.label as variant_label
     FROM cart_items ci 
     JOIN products p ON ci.product_id = p.id 
     LEFT JOIN product_variants v ON ci.variant_id = v.id
     WHERE ci.user_id = $1`, [userId]
  );
  if (!cartItems.length) return res.status(400).json({ error: 'Cart is empty' });
  const total = (await one(
    `SELECT COALESCE(SUM(ci.quantity * COALESCE(v.price, p.cost_per_unit)),0) as total
     FROM cart_items ci 
     JOIN products p ON ci.product_id = p.id 
     LEFT JOIN product_variants v ON ci.variant_id = v.id
     WHERE ci.user_id = $1`, [userId]
  )).total || 0;
  const o = await one(
    'INSERT INTO orders (user_id, total_amount, payment_method, delivery_address, status, status_note) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id',
    [userId, total, paymentMethod, deliveryAddress || null, 'pending', note || null]
  );
  for (const it of cartItems) {
    await pool.query(
      'INSERT INTO order_items (order_id, product_id, product_name, quantity, price_per_unit, variant_id, variant_label) VALUES ($1,$2,$3,$4,$5,$6,$7)',
      [o.id, it.product_id, it.name, it.quantity, it.price, it.variant_id || null, it.variant_label || null]
    );
    if (it.variant_id) await pool.query('UPDATE product_variants SET stock_available = stock_available - $1 WHERE id=$2', [it.quantity, it.variant_id]);
    else await pool.query('UPDATE products SET stock_available = stock_available - $1 WHERE id=$2', [it.quantity, it.product_id]);
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

// Users basic export (name, number)
app.get('/users-basic', async (req, res) => {
  res.json(await all('SELECT id, full_name, number FROM users ORDER BY created_at ASC'));
});

// Notifications APIs
app.get('/notifications', async (req, res) => {
  const userId = req.query.userId ? Number(req.query.userId) : null;
  if (userId) {
    res.json(await all('SELECT * FROM notifications WHERE user_id IS NULL OR user_id=$1 ORDER BY created_at DESC', [userId]));
  } else {
    res.json(await all('SELECT * FROM notifications WHERE user_id IS NULL ORDER BY created_at DESC'));
  }
});
app.post('/notifications', async (req, res) => {
  const { title, message } = req.body || {};
  if (!title || !message) return res.status(400).json({ error: 'title and message required' });
  const r = await one('INSERT INTO notifications (title, message) VALUES ($1,$2) RETURNING id', [title, message]);
  res.json(r);
});

// Logistics APIs
app.get('/logistics', async (req, res) => {
  const rows = await all('SELECT * FROM logistics ORDER BY name ASC');
  res.json(rows);
});
app.post('/logistics', async (req, res) => {
  const { name, tracking_url } = req.body || {};
  if (!name || !String(name).trim()) return res.status(400).json({ error: 'name required' });
  try {
    const r = await one('INSERT INTO logistics (name, tracking_url) VALUES ($1,$2) RETURNING id', [String(name).trim(), tracking_url || null]);
    res.json(r);
  } catch (e) {
    if (String(e.message).toLowerCase().includes('unique')) return res.status(400).json({ error: 'exists' });
    console.error(e); res.status(500).json({ error: 'failed' });
  }
});
app.delete('/logistics/:id', async (req, res) => {
  await pool.query('DELETE FROM logistics WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.patch('/orders/:id', async (req, res) => {
  const { status, statusNote, deliveryDate, logisticsName, trackingNumber, trackingUrl } = req.body || {};
  const set = []; const vals=[]; let i=1;
  if (status !== undefined) { set.push(`status=$${i++}`); vals.push(status); }
  set.push(`updated_at=now()`);
  if (statusNote !== undefined) { set.push(`status_note=$${i++}`); vals.push(statusNote); }
  if (deliveryDate !== undefined) { set.push(`delivery_date=$${i++}`); vals.push(deliveryDate); }
  if (logisticsName !== undefined) { set.push(`logistics_name=$${i++}`); vals.push(logisticsName); }
  if (trackingNumber !== undefined) { set.push(`tracking_number=$${i++}`); vals.push(trackingNumber); }
  if (trackingUrl !== undefined) { set.push(`tracking_url=$${i++}`); vals.push(trackingUrl); }
  vals.push(req.params.id);
  await pool.query(`UPDATE orders SET ${set.join(', ')} WHERE id=$${i}`, vals);
  // Send notification to the order owner (user-specific)
  try {
    const o = await one('SELECT user_id FROM orders WHERE id=$1', [req.params.id]);
    if (o && o.user_id) {
      const s = (status || '').toString();
      const title = `Order #${req.params.id} Updated`;
      const msg = `Status: ${s || 'updated'}${statusNote ? ` - ${statusNote}` : ''}`;
      await pool.query('INSERT INTO notifications (title, message, user_id) VALUES ($1,$2,$3)', [title, msg, o.user_id]);
    }
  } catch {}
  res.json({ ok: true });
});

app.delete('/orders/:id', async (req, res) => {
  await pool.query('DELETE FROM orders WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

app.listen(PORT, () => console.log(`API listening on :${PORT}`));
