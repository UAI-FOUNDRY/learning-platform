from datetime import datetime

def get_current_utc_timestamp() -> str:
    return datetime.utcnow().isoformat()
