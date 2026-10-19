"""
Create (or promote) the platform's Super Admin account.

Public registration can never create a super_admin, so the first admin must be made
with this script. Run it from the backend/ folder after `alembic upgrade head`:

    python -m scripts.create_super_admin --email admin@example.com --name "Platform Admin"

The password is asked for interactively (or read from SUPER_ADMIN_PASSWORD for CI).
If the email already belongs to a user, that user is promoted to super_admin and
re-activated; their password is only changed if you pass --reset-password.
"""
import argparse
import getpass
import os
import sys

from app.database.session import SessionLocal
from app.models.user import User
from app.utils.security import get_password_hash
from app.utils.validators import is_valid_email

MIN_PASSWORD_LENGTH = 8


def _read_password() -> str:
    env_password = os.environ.get("SUPER_ADMIN_PASSWORD")
    if env_password:
        return env_password
    first = getpass.getpass("Password: ")
    second = getpass.getpass("Repeat password: ")
    if first != second:
        sys.exit("Passwords do not match.")
    return first


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Create or promote a Super Admin account.")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", default="Super Admin", help="Full name (new accounts only)")
    parser.add_argument("--reset-password", action="store_true", help="Also set a new password for an existing user")
    args = parser.parse_args(argv)

    email = args.email.lower().strip()
    if not is_valid_email(email):
        sys.exit(f"Invalid email address: {email}")
    if SessionLocal is None:
        sys.exit("DATABASE_URL is not configured. Set it in backend/.env first.")

    db = SessionLocal()
    try:
        user = db.query(User).filter(User.email == email).first()
        if user is None or args.reset_password:
            password = _read_password()
            if len(password) < MIN_PASSWORD_LENGTH:
                sys.exit(f"Password must be at least {MIN_PASSWORD_LENGTH} characters.")
        if user is None:
            user = User(
                email=email,
                full_name=args.name.strip() or "Super Admin",
                hashed_password=get_password_hash(password),
                role="super_admin",
                status="active",
                is_email_verified=True,
            )
            db.add(user)
            action = "Created"
        else:
            user.role = "super_admin"
            user.status = "active"
            if args.reset_password:
                user.hashed_password = get_password_hash(password)
            action = "Promoted"
        db.commit()
        print(f"{action} super_admin: {email} (id {user.id})")
        return 0
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
