# AlleyStock — SPEC

Stock & sales control for an Artist Alley stand. UI in Spanish.

## Auth
- Single admin user, collection `users` (pbkdf2 hash). Bootstrapped on startup if missing: **admin / 1234**.
- Login POST /api/auth/login sets httpOnly cookie `alley_session` (collection `sessions`, TTL 30d). /api/auth/me, /api/auth/logout, PUT /api/auth/credentials.
- All endpoints require auth except login, logout, GET /api/settings (public: login screen shows logo/name).

## Data model
- `settings` (id="main"): store_name, event_name, logo_url (data URL or http URL, null => text name shown), currency (ISO code), low_stock_threshold (int, low = 0 < stock <= threshold), timezone, product_types[], fandoms[].
- `products`: id, name, type, fandom, price, image (data URL / URL / null), notes, stock, sold_total, created_at, updated_at.
- `movements`: id, product_id, product_name/type/fandom (snapshot), kind sale|restock|adjust, qty, unit_price, total, note, date (YYYY-MM-DD in settings.timezone), created_at.

## Endpoints (/api)
- GET/POST /products, GET/PUT/DELETE /products/{id}, GET /products/{id}/movements
- POST /products/{id}/stock {kind, qty, note?, unit_price?} → {product, movement}; sale/adjust with insufficient stock → 400
- POST /movements/{id}/undo → reverts stock and deletes movement
- GET /sales?date=YYYY-MM-DD (default today) → SalesDay {date, today, total_units, total_revenue, restock_units, adjust_units, items[], movements[]}
- GET/PUT /settings

## Frontend routes
/login, / (welcome + metrics + low-stock alerts + nav shortcuts), /productos (filters type/fandom/status/search/sort, -1 quick sale with Undo toast, red=out, amber=low), /productos/nuevo, /productos/:id (edit + sell/remove/add stock + history), /ventas (daily log, by product, movements, CSV), /configuracion, /manual.

## Seed
`python backend/seed.py` inserts 9 demo products if catalogue empty (e.g. "Print A5 Equipo 7" stock 0, "Llavero Kakashi" stock 1, "Chapa Luffy Gear 5" stock 2, "Chapa Goku Ultra Instinto" stock 24). Default threshold 3.

## Deploy
netlify.toml (frontend, BACKEND_URL env → dist/_redirects proxy /api), render.yaml (backend, requirements-deploy.txt), MANUAL.md.
