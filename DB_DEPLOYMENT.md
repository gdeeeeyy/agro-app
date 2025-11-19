# Database Deployment Guide (Free, Detailed)

This guide sets up a free, secure, centrally hosted database for the app with a web dashboard and a simple API the app can call.

Stack

- Database: Postgres on **Supabase** (recommended) or Neon (both free tier, browser dashboard, SSL)
- API: Node/Express on Render (free web service) that talks to your hosted Postgres
- App: Points to your API via `EXPO_PUBLIC_API_URL`

What you’ll get

- A persistent hosted Postgres with a web dashboard
- A hosted HTTPS API the mobile app uses
- Admin control via both Neon dashboard and the in-app Admin tab (once you promote your account)

Prerequisites

- GitHub account (to connect Render to this repository)
- Neon account (free) and Render account (free)
- Basic CLI available (curl, sed, openssl)

1. Prepare the repository

- Ensure this repository is pushed to GitHub (private or public is fine).
- Server code for the API is in `server/`.
- Postgres schema is in `server/schema.sql`.

2. Create the free Postgres on Supabase (or Neon)

1) Go to supabase.com (or neon.tech) and create a new project.
2) Pick a region close to your users.
3) From the project settings, copy the **Postgres connection string**. For managed hosts like Supabase/Neon, include SSL, e.g.
   ```text path=null start=null
   postgres://USER:PASSWORD@HOST/DB?sslmode=require
   ```
4) Open the SQL editor for your project (Supabase SQL editor or Neon SQL editor).
5) Apply the schema using the included file at `server/schema.sql`:
   - In browser: open `server/schema.sql`, copy all, paste into the SQL editor, Run.
   - Or via CLI from your machine:
     ```bash path=null start=null
     psql "postgres://USER:PASSWORD@HOST/DB?sslmode=require" -f server/schema.sql
     ```
6) Start your Render API once; the runtime migrations in `server/index.js` will create the remaining tables/columns (orders, variants, messaging, notifications, etc.) in the same Supabase database.
7) Verify tables exist:
   ```sql path=null start=null
   \dt
   SELECT table_name FROM information_schema.tables WHERE table_schema='public';
   ```

3. Deploy the API on Render (free web service)

1) Go to render.com → New → Web Service → Connect your GitHub repo.
2) Settings during creation:
   - Root Directory: `server`
   - Build Command:
     ```bash path=null start=null
     npm install --omit=dev
     ```
   - Start Command:
     ```bash path=null start=null
     node index.js
     ```
- Environment → Add variable
    ```text path=null start=null
    DATABASE_URL=postgres://USER:PASSWORD@HOST/DB?sslmode=require
    ```
3) Create the service and wait for deploy to complete.
4) Copy the public URL of your service, e.g. `https://agriismart-api.onrender.com`.
5) Verify the health endpoint:
   ```bash path=null start=null
   curl https://agriismart-api.onrender.com/health
   # Expected: {"ok":true}
   ```

Notes

- SSL: Neon requires SSL; the example `sslmode=require` ensures secure connection.
- Free tier: Render free services may sleep; first request can take a few seconds.
- CORS: API uses permissive CORS by default. You can restrict origins by replacing `app.use(cors())` with `cors({ origin: ["https://your-site"], credentials: true })`.

4. Point the mobile app to the API

1) Create `.env` in the repo root:
   ```env path=null start=null
   EXPO_PUBLIC_API_URL=https://agriismart-api.onrender.com
   ```
2) Rebuild the APK so the env is embedded:
   ```bash path=null start=null
   bash -lc 'cd android && ./gradlew --no-daemon assembleDebug'
   ```
3) Install to device:
   ```bash path=null start=null
   adb install -r android/app/build/outputs/apk/debug/app-debug.apk
   ```

5. Create your account and promote to admin (optional)
   Option A: In-app

- Open the app → Sign Up (this stores a SHA-256 hash of your password via the API).
- After signup, promote your user to admin using Neon’s SQL editor:
  ```sql path=null start=null
  UPDATE users SET is_admin = 1 WHERE number = 'YOUR_PHONE_NUMBER';
  ```
- Log in; the Admin tab will be available.

Option B: Insert admin manually (without app signup)

- Compute SHA-256 for your password:
  ```bash path=null start=null
  echo -n 'admin123' | sha256sum | awk '{print $1}'
  # copy the 64-char hex hash
  ```
- Insert directly in Neon (replace the hash):
  ```sql path=null start=null
  INSERT INTO users (number, password, full_name, is_admin)
  VALUES ('1234567890', 'YOUR_SHA256_HASH', 'Admin User', 1);
  ```

6. Sanity checks (API ↔ DB)

- Products list (empty initially):
  ```bash path=null start=null
  curl "$EXPO_PUBLIC_API_URL/products"
  ```
- Sign up, sign in (from the app), then confirm the row in Neon:
  ```sql path=null start=null
  SELECT id, number, is_admin, created_at FROM users ORDER BY id DESC LIMIT 5;
  ```
- Create a product using the Admin tab; verify in Neon:
  ```sql path=null start=null
  SELECT id, name, stock_available, cost_per_unit FROM products ORDER BY id DESC LIMIT 5;
  ```

7. Backups, migrations, maintenance

- Backups (ad-hoc):
  ```bash path=null start=null
  pg_dump "postgres://<USER>:<PASSWORD>@<HOST>/<DB>?sslmode=require" -Fc -f backup.dump
  ```
- Restore:
  ```bash path=null start=null
  pg_restore -d "postgres://<USER>:<PASSWORD>@<HOST>/<DB>?sslmode=require" -c backup.dump
  ```
- Migrations: edit `server/schema.sql`, apply in Neon SQL editor (or use a migration tool in the API repo if desired).

8. Security hardening (recommended)

- Change Render CORS to only allow your app origins.
- Regenerate DB password from Neon if leaked; update Render env.
- Add rate limiting to API (e.g., express-rate-limit) if exposing publicly.
- Consider adding admin authentication endpoints (JWT) if you expose write endpoints in other tools.

9. Troubleshooting

- `ECONNREFUSED` or `self signed certificate`: ensure `?sslmode=require` and Render env `DATABASE_URL` matches Neon’s string.
- `Permission denied` or 401 on sign in: password must be SHA-256 hash; the app handles hashing automatically. If seeding manually, store the SHA-256 hex string.
- API sleeping/slow first request: expected on Render free tier.
- CORS errors: tighten/adjust `cors()` settings and make sure the URL in `.env` exactly matches (scheme/host/port).

Appendix: Schema (reference)

- Full schema is in `server/schema.sql`.
- Keep mobile and server schemas in sync when adding fields.
