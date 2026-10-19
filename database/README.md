# Database guide

The database is **PostgreSQL** (hosted on **Supabase**), and the schema is managed with
**Alembic** migrations that live in `backend/alembic/versions/`.

| What | Where |
|---|---|
| Table definitions (source of truth) | `backend/app/models/*.py` (SQLAlchemy) |
| Migrations | `backend/alembic/versions/` |
| Full schema to read (generated, don't run) | `database/schema/database-schema.sql` |
| Seed data | `database/seeds/` |
| Design overview (all 58 tables) | `docs/database-design.md` |

The rule: **models and migrations always change together.** CI fails if they drift apart.

---

## 1. Set up Supabase (first time)

1. In Supabase, open your project → **Connect**. Copy a connection string:
   - **Direct connection** (`db.<project-ref>.supabase.co:5432`, user `postgres`) is the right one for
     migrations, but it is **IPv6-only** unless you bought the IPv4 add-on.
   - If your network is IPv4-only (most home / college Wi-Fi), use the **Session pooler**
     (`aws-<n>-<region>.pooler.supabase.com:5432`, user `postgres.<project-ref>`). Copy the host
     exactly from the dialog.
   - **Don't** use the Transaction pooler (port `6543`) for migrations.
2. Put it in `backend/.env` (never commit this file):
   ```env
   DATABASE_URL=postgresql://postgres.<project-ref>:<password>@aws-<n>-<region>.pooler.supabase.com:5432/postgres
   SECRET_KEY=<a long random string>
   ```
   If the password contains special characters (`@`, `#`, `%`, `/`), URL-encode them.
3. Create the schema:
   ```bash
   cd backend
   pip install -r requirements.txt
   alembic upgrade head
   ```
4. Load the categories, then create the first Super Admin. Public sign-up can never create one,
   so you need this script:
   ```bash
   psql "$DATABASE_URL" -f ../database/seeds/categories.sql   # or paste it into the Supabase SQL editor
   python -m scripts.create_super_admin --email you@example.com --name "Your Name"
   ```
5. Check: `uvicorn app.main:app --reload` → `GET /api/health` should report `"database": "connected"`.

### Already ran the old `database-schema.sql` on Supabase?
Nothing to delete. Run `alembic upgrade head` as above. Revision `0001` recognises the existing
tables, fixes the old file's differences (missing NOT NULLs and indexes), and later revisions remove
duplicate rows before adding the new unique rules. Back up first anyway (Supabase → Database → Backups).

### Why every table has Row Level Security turned on
Supabase automatically exposes every table in the `public` schema through a REST API that anyone holding
your project's public `anon` key can call, and that key ships inside frontend code. Revision `0004` turns
on RLS with **no policies** and revokes the `anon` / `authenticated` roles' access, so that API returns
nothing. Our FastAPI backend connects as the table owner (`postgres`), which is not affected by RLS.
**Do not** add RLS policies or use `supabase-js` to query these tables from the frontend. All
data goes through the FastAPI backend.

---

## 2. Local development (without Supabase)

```bash
docker run -d --name lp-db -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=learning_platform -p 5432:5432 postgres:15
# backend/.env: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/learning_platform
cd backend
alembic upgrade head
psql postgresql://postgres:postgres@localhost:5432/learning_platform -f ../database/seeds/categories.sql
psql postgresql://postgres:postgres@localhost:5432/learning_platform -f ../database/seeds/test_data.sql   # dev only
python -m scripts.create_super_admin --email admin@dev.local
```
`test_data.sql` adds an instructor, two learners (password `Password123`), a demo university,
a published Python course with a quiz, an assignment and a coding exercise, and some progress.
**Never run it on the shared Supabase database.**

---

## 3. Changing the schema (everyday workflow)

1. Edit or add a model in `backend/app/models/` (and import new models in `models/__init__.py`).
2. Generate a migration against your **local** database:
   ```bash
   alembic revision --autogenerate -m "add xyz to courses"
   ```
3. **Read the generated file.** Autogenerate misses some things. Add them by hand:
   - `CheckConstraint`s on existing tables (`op.create_check_constraint`)
   - names for foreign keys added to existing tables (`op.create_foreign_key("fk_<table>_<col>", ...)`)
   - data fixes, e.g. de-duplicating rows before adding a unique constraint (see `0002`)
   - new tables need RLS on Supabase: add `op.execute('ALTER TABLE <name> ENABLE ROW LEVEL SECURITY')`
4. Apply and verify:
   ```bash
   alembic upgrade head
   alembic check          # must say "No new upgrade operations detected"
   alembic downgrade -1 && alembic upgrade head   # downgrade must work too
   pytest
   ```
5. Commit the model and the migration **in the same PR**.

Rules:
- Never edit a migration that has already been applied to the shared Supabase database. Write a new one.
- One person applies migrations to Supabase (after the PR is merged), so two branches don't race.
- If two branches both add a migration, Alembic reports "multiple heads". Fix it with
  `alembic merge heads -m "merge"`.

Useful commands: `alembic current`, `alembic history`, `alembic downgrade -1`.

---

## 4. Revisions so far

| Revision | What it does |
|---|---|
| `0001` baseline | The original 16 tables. On a database built from the old SQL file, it reconciles instead of recreating. |
| `0002` extend core tables | User status (active / inactive / suspended), unique progress per lecture (the race-condition fix), one review / certificate / submission / org membership per user, course metadata, subcategories, lecture types, quiz and assignment upgrades, CHECK constraints. Removes existing duplicates first. |
| `0003` feature tables | 42 new tables: coding workspace, Q&A, moderation, notifications, approval history, notes, bookmarks, wishlist, security / audit logs, settings, personalization, gamification, AI. |
| `0004` Supabase security & defaults | RLS on every table, revokes API-role access, default platform settings and starter badges. |

Regenerate the reference schema after adding migrations:
```bash
pg_dump "$DATABASE_URL" --schema-only --no-owner --no-privileges --exclude-table=alembic_version > database/schema/database-schema.sql
```
