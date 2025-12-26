from passlib.context import CryptContext
from typing import Tuple
import hashlib

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    # Truncate to 72 bytes for bcrypt compatibility (bcrypt limit)
    password_truncated = password[:72]
    return pwd_context.hash(password_truncated)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        # Truncate to 72 bytes for bcrypt compatibility
        password_truncated = plain_password[:72]
        return pwd_context.verify(password_truncated, hashed_password)
    except Exception as e:
        print(f"Password verification error: {e}")
        return False


def needs_rehash(hashed_password: str) -> bool:
    try:
        return pwd_context.needs_update(hashed_password)
    except Exception:
        return False
