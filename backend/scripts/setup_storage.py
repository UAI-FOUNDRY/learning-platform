"""Create the Supabase Storage buckets this app uses (run once per Supabase project).

    cd backend && python scripts/setup_storage.py

Needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env (Project Settings -> API in Supabase).
Creates a public bucket (thumbnails, avatars) and a private bucket (videos, resources, submissions).
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.storage_service import StorageError, storage_service  # noqa: E402

if __name__ == "__main__":
    try:
        for bucket, outcome in storage_service.ensure_buckets().items():
            print(f"{bucket}: {outcome}")
    except StorageError as exc:
        print(f"Error: {exc}")
        sys.exit(1)
