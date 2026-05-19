from datetime import datetime, timedelta, timezone
import os

import jwt
from fastapi import HTTPException, Request, status


JWT_SECRET = os.getenv("JWT_SECRET", "dev-only-change-me")
JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


def create_access_token(*, student_id: str, full_name: str) -> str:
    return create_access_token_for_user(subject=student_id, full_name=full_name, role="student")


def create_access_token_for_user(*, subject: str, full_name: str, role: str) -> str:
    expire_at = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": subject,
        "full_name": full_name,
        "role": role,
        "exp": expire_at,
        "token_type": "access",
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        if payload.get("token_type") != "access":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
        return payload
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token expired") from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from exc


def extract_access_token(request: Request) -> str:
    cookie_token = request.cookies.get("access_token")
    if cookie_token:
        return cookie_token

    authorization = request.headers.get("Authorization")
    if authorization and authorization.startswith("Bearer "):
        return authorization.removeprefix("Bearer ").strip()

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")