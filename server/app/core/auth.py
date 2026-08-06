"""
JWT auth middleware for FastAPI.

Supabase phát JWT token dùng RS256 (asymmetric signing).
Backend verify token bằng Public Key lấy từ JWKS endpoint của Supabase.
Public key được cache in-memory để tránh gọi HTTP mỗi request.

Token được gửi qua header: Authorization: Bearer <token>
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt as pyjwt
from jwt import PyJWKClient
from functools import lru_cache

from app.core.config import settings

security = HTTPBearer()


@lru_cache(maxsize=1)
def _get_jwks_client() -> PyJWKClient:
    """
    Tạo JWKS client một lần duy nhất (cached).
    Tự động lấy public key từ Supabase JWKS endpoint.
    """
    jwks_url = f"{settings.supabase_url}/auth/v1/.well-known/jwks.json"
    return PyJWKClient(jwks_url, cache_keys=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Dependency: verify JWT bằng RS256 public key từ Supabase JWKS.
    Trả về payload (bao gồm sub = user uuid).
    """
    token = credentials.credentials
    try:
        jwks_client = _get_jwks_client()
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            options={"verify_aud": False},
        )

        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ: thiếu sub",
            )
        return payload

    except pyjwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token đã hết hạn, vui lòng đăng nhập lại",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except pyjwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token không hợp lệ: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Xác thực thất bại: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_user_id(user: dict = Depends(get_current_user)) -> str:
    """Shortcut dependency: chỉ lấy user UUID."""
    return user["sub"]

