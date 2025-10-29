# Free Postgres hosting + API (Neon + Render)

This sets up a free Postgres with a web dashboard and a free Node API your app can call.

1) Create a free Postgres (Neon)
- Go to neon.tech → New project → copy the connection string (include `?sslmode=require`).
- In the Neon SQL editor, run the schema from server/schema.sql (below).

2) Deploy the API (Render free web service)
- Push this repo to GitHub (private ok).
- In Render, create a new Web Service → pick repo → Root Directory: `server` → Build Command: `npm install --omit=dev` → Start Command: `node index.js`.
- Add env var: `DATABASE_URL=<your Neon connection string>`.
- After deploy, note your API URL, e.g. https://agriismart-api.onrender.com

3) Point the app to the API
- Create `.env` in the project root:
  ```
  EXPO_PUBLIC_API_URL=https://agriismart-api.onrender.com
  ```
- Rebuild the APK so the env is embedded.

4) Verify
- `curl $EXPO_PUBLIC_API_URL/health` → `{ ok: true }`
- Sign up in the app; data should appear in Neon’s dashboard under the tables.

server/schema.sql (Postgres)
```sql
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
```
