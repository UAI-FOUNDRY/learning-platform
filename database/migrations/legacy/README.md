# Legacy SQL migrations (superseded)

These two hand-written scripts were used before the project moved to **Alembic**.
Both are already folded into Alembic revision `0001` (`backend/alembic/versions/0001_baseline_schema.py`),
which also upgrades databases that were created with them.

Do not run these files. All schema changes now live in `backend/alembic/versions/`.
See `database/README.md`.
