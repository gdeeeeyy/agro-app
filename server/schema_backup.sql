-- Full schema backup / reset script for Neon Postgres
-- WARNING: Running this will DROP and RECREATE all application tables.
-- Use only when you are sure you want to reset the database structure.

BEGIN;

-- 1. Drop tables in dependency-safe order
DROP TABLE IF EXISTS order_status_history CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS product_variants CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS keywords CASCADE;
DROP TABLE IF EXISTS crop_pest_images CASCADE;
DROP TABLE IF EXISTS crop_disease_images CASCADE;
DROP TABLE IF EXISTS crop_pests CASCADE;
DROP TABLE IF EXISTS crop_diseases CASCADE;
DROP TABLE IF EXISTS crop_guides CASCADE;
DROP TABLE IF EXISTS crops CASCADE;
DROP TABLE IF EXISTS scan_plants CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS push_tokens CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS logistics CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Create core tables

CREATE TABLE users (
  id          BIGSERIAL PRIMARY KEY,
  number      TEXT UNIQUE NOT NULL,
  password    TEXT NOT NULL,
  full_name   TEXT,
  address     TEXT,
  is_admin    INTEGER DEFAULT 0,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE products (
  id              BIGSERIAL PRIMARY KEY,
  name            TEXT NOT NULL,
  plant_used      TEXT NOT NULL,
  keywords        TEXT NOT NULL,
  details         TEXT NOT NULL,
  name_ta         TEXT,
  plant_used_ta   TEXT,
  details_ta      TEXT,
  image           TEXT,
  unit            TEXT,
  seller_name     TEXT,
  stock_available INTEGER DEFAULT 0,
  cost_per_unit   DOUBLE PRECISION NOT NULL,
  status          TEXT DEFAULT 'approved',
  created_by      BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_by     BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
  reviewed_at     TIMESTAMPTZ,
  review_note     TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE keywords (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendors (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crops (
  id         BIGSERIAL PRIMARY KEY,
  name       TEXT UNIQUE NOT NULL,
  name_ta    TEXT,
  image      TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crop_guides (
  id                     BIGSERIAL PRIMARY KEY,
  crop_id                BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  language               TEXT NOT NULL DEFAULT 'en',
  cultivation_guide      TEXT,
  pest_management        TEXT,
  disease_management     TEXT,
  cultivation_guide_ta   TEXT,
  pest_management_ta     TEXT,
  disease_management_ta  TEXT,
  updated_at             TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, language)
);

CREATE TABLE crop_pests (
  id              BIGSERIAL PRIMARY KEY,
  crop_id         BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  language        TEXT NOT NULL DEFAULT 'en',
  name            TEXT NOT NULL,
  description     TEXT,
  management      TEXT,
  name_ta         TEXT,
  description_ta  TEXT,
  management_ta   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, language, name)
);

CREATE TABLE crop_pest_images (
  id          BIGSERIAL PRIMARY KEY,
  pest_id     BIGINT NOT NULL REFERENCES crop_pests(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  caption     TEXT,
  caption_ta  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE crop_diseases (
  id              BIGSERIAL PRIMARY KEY,
  crop_id         BIGINT NOT NULL REFERENCES crops(id) ON DELETE CASCADE,
  language        TEXT NOT NULL DEFAULT 'en',
  name            TEXT NOT NULL,
  description     TEXT,
  management      TEXT,
  name_ta         TEXT,
  description_ta  TEXT,
  management_ta   TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(crop_id, language, name)
);

CREATE TABLE crop_disease_images (
  id          BIGSERIAL PRIMARY KEY,
  disease_id  BIGINT NOT NULL REFERENCES crop_diseases(id) ON DELETE CASCADE,
  image_url   TEXT NOT NULL,
  caption     TEXT,
  caption_ta  TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cart_items (
  id          BIGSERIAL PRIMARY KEY,
  user_id     BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id  BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1,
  variant_id  BIGINT REFERENCES product_variants(id),
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE orders (
  id               BIGSERIAL PRIMARY KEY,
  user_id          BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_amount     DOUBLE PRECISION NOT NULL,
  payment_method   TEXT NOT NULL,
  delivery_address TEXT,
  status           TEXT DEFAULT 'pending',
  status_note      TEXT,
  delivery_date    TEXT,
  logistics_name   TEXT,
  tracking_number  TEXT,
  tracking_url     TEXT,
  stock_deducted   BOOLEAN DEFAULT false,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
  id              BIGSERIAL PRIMARY KEY,
  order_id        BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id      BIGINT NOT NULL REFERENCES products(id),
  product_name    TEXT NOT NULL,
  quantity        INTEGER NOT NULL,
  price_per_unit  DOUBLE PRECISION NOT NULL,
  variant_id      BIGINT,
  variant_label   TEXT,
  rating          INTEGER,
  review          TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_status_history (
  id         BIGSERIAL PRIMARY KEY,
  order_id   BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_order_status_history_order
  ON order_status_history(order_id, created_at);

CREATE TABLE conversations (
  id         BIGSERIAL PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE conversation_participants (
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE messages (
  id              BIGSERIAL PRIMARY KEY,
  conversation_id BIGINT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text            TEXT NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_conversation
  ON messages(conversation_id, created_at);

CREATE TABLE notifications (
  id         BIGSERIAL PRIMARY KEY,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  title_ta   TEXT,
  message_ta TEXT,
  user_id    BIGINT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE push_tokens (
  id         BIGSERIAL PRIMARY KEY,
  user_id    BIGINT NULL REFERENCES users(id) ON DELETE CASCADE,
  token      TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE logistics (
  id          BIGSERIAL PRIMARY KEY,
  name        TEXT UNIQUE NOT NULL,
  tracking_url TEXT,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE scan_plants (
  id       BIGSERIAL PRIMARY KEY,
  name     TEXT UNIQUE NOT NULL,
  name_ta  TEXT
);

CREATE TABLE product_variants (
  id              BIGSERIAL PRIMARY KEY,
  product_id      BIGINT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label           TEXT NOT NULL,
  price           DOUBLE PRECISION NOT NULL,
  stock_available INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_id, label)
);

-- 3. Adjust constraints (cart unique index including variant)

-- Unique per (user, product, variant)
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_user_id_product_id_key'
  ) THEN
    ALTER TABLE cart_items DROP CONSTRAINT cart_items_user_id_product_id_key;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cart_items_user_product_variant_unique'
  ) THEN
    ALTER TABLE cart_items
      ADD CONSTRAINT cart_items_user_product_variant_unique
      UNIQUE (user_id, product_id, variant_id);
  END IF;
END $$;

COMMIT;
