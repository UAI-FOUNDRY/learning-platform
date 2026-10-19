"""Evaluates coding submissions that were left 'queued' (the server restarted, or a run was interrupted).

    cd backend && python scripts/coding_worker.py            # one pass, then exit
    cd backend && python scripts/coding_worker.py --loop     # keep checking every 10 seconds

Normal runs are evaluated by the API itself right after the response; this is only the safety net.
"""
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database.session import SessionLocal  # noqa: E402
from app.services.coding_service import coding_service  # noqa: E402


def one_pass() -> int:
    db = SessionLocal()
    try:
        ids = coding_service.requeue_stuck(db, older_than_seconds=60)
    finally:
        db.close()
    for submission_id in ids:
        coding_service.evaluate(submission_id)
    return len(ids)


if __name__ == "__main__":
    while True:
        count = one_pass()
        print(f"evaluated {count} stuck submission(s)")
        if "--loop" not in sys.argv:
            break
        time.sleep(10)
