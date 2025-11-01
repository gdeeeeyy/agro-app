-- Postgres schema for Agri iSmart (server-side DB)

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  full_name TEXT,
  address TEXT,
  is_admin INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
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
);

CREATE TABLE IF NOT EXISTS cart_items (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
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
);

CREATE TABLE IF NOT EXISTS order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price_per_unit DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS keywords (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Crops master (admin-managed)
CREATE TABLE IF NOT EXISTS crops (
  id BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  name_ta TEXT,
  image TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Crop guides (language-specific)
CREATE TABLE IF NOT EXISTS crop_guides (
  id BIGSERIAL PRIMARY KEY,
  crop_id BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  cultivation_guide TEXT,
  pest_management TEXT,
  disease_management TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, language)
);

-- Pests and Diseases nested under crops (per language)
CREATE TABLE IF NOT EXISTS crop_pests (
  id BIGSERIAL PRIMARY KEY,
  crop_id BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  name TEXT NOT NULL,
  description TEXT,
  management TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, language, name)
);
CREATE TABLE IF NOT EXISTS crop_pest_images (
  id BIGSERIAL PRIMARY KEY,
  pest_id BIGINT NOT NULL REFERENCES crop_pests(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  caption_ta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS crop_diseases (
  id BIGSERIAL PRIMARY KEY,
  crop_id BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  language TEXT NOT NULL DEFAULT 'en',
  name TEXT NOT NULL,
  description TEXT,
  management TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, language, name)
);
CREATE TABLE IF NOT EXISTS crop_disease_images (
  id BIGSERIAL PRIMARY KEY,
  disease_id BIGINT NOT NULL REFERENCES crop_diseases(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  caption TEXT,
  caption_ta TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
