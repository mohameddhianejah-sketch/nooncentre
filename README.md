# NOON Center — Full Website + Admin Dashboard

Full-stack rebuild of the NOON Center site: **React** frontend + **Django REST
Framework** backend, with a custom admin dashboard for managing everything without
touching code.

```
noon-backend/     Django REST API (see noon-backend/README.md)
noon-frontend/    React + Vite site & dashboard (see noon-frontend/README.md)
```

## Quick start (run both together)

**1. Backend** (terminal 1):
```bash
cd noon-backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_data
python manage.py createsuperuser
python manage.py runserver
```

**2. Frontend** (terminal 2):
```bash
cd noon-frontend
npm install
npm run dev
```

Visit `http://localhost:5173` for the public site, `http://localhost:5173/admin`
for the dashboard (log in with the superuser you just created).

## What you get

- **Bilingual site** (FR/AR, full RTL support) — Home, Services, About, Contact
- **Real booking flow** — the contact form creates a database record *and* opens
  WhatsApp pre-filled, so nothing gets lost even if a message isn't sent
- **Admin dashboard** at `/admin` — manage bookings, services & pricing, categories,
  testimonials, opening hours, and site info (tagline/about/address/phone) — all
  without redeploying code
- **Django admin** at `/admin/` on the backend (i.e. `localhost:8000/admin/`) as a
  power-user fallback with the same data, useful for bulk edits or troubleshooting

## Database

The site runs on **PostgreSQL 18** (local service), database `nooncenter`, owned by
a dedicated `noon` user. The connection lives in `noon-backend/.env`:

```
DATABASE_URL=postgres://noon:PASSWORD@localhost:5432/nooncenter
```

`.env` is gitignored; settings auto-loads it (via `python-dotenv`) but a real
environment variable always wins. Tell Django to log in with any other Postgres by
setting `DATABASE_URL`. Without it the backend falls back to SQLite
(`noon-backend/db.sqlite3`). Database backups and exports contain personal data;
keep them outside this repository and never commit them.

To build the schema and starter data on a new machine, run `python manage.py migrate`
then `python manage.py seed_data`. Restore a private backup only from a secured
location outside the repository.

## Deploying

- **Backend:** any host that runs Python (Railway, Render, PythonAnywhere, a VPS).
  Attach a PostgreSQL addon and set `DATABASE_URL` if you outgrow SQLite.
- **Frontend:** `npm run build` in `noon-frontend/`, deploy the `dist/` folder to
  Netlify, Vercel, or any static host. Set `VITE_API_URL` to your deployed backend
  URL before building.
- Update `CORS_ALLOWED_ORIGINS` on the backend to your real frontend domain.

## Content already loaded (via `seed_data`)

- 4 categories, 17 services with your real pricing (visage, corps, épilation, mains & pieds)
- The "Forfait Journée Détente" package
- Opening hours: closed Monday, 09:00–19:00 every other day
- 3 starter testimonials
- Site settings: founder Saloua Nejah, founded 2015, Boumhel El Bassatine address

Everything above is editable from `/admin` — the seed data is just a starting point.
