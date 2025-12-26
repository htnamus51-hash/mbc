import os
import jwt
from datetime import datetime, timedelta
from typing import Optional, Dict, Any

# Read secret from env or use a fallback (only for development)
JWT_SECRET = os.environ.get("JWT_SECRET", "dev_secret_change_me")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXP_MINUTES = int(os.environ.get("JWT_EXP_MINUTES", "15"))


def create_access_token(subject: str, expires_minutes: Optional[int] = None) -> str:
    """Create a signed JWT with subject in `sub` claim."""
    if expires_minutes is None:
        expires_minutes = JWT_EXP_MINUTES
    now = datetime.utcnow()
    exp = now + timedelta(minutes=expires_minutes)
    payload: Dict[str, Any] = {
        "sub": subject,
        "iat": now,
        "exp": exp,
    }
    token = jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)
    # PyJWT may return bytes on some versions; ensure string
    if isinstance(token, bytes):
        token = token.decode('utf-8')
    return token


def verify_token(token: str) -> Optional[Dict[str, Any]]:
    """Verify token and return payload or None on failure."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except Exception:
        return None

