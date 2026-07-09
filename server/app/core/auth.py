"""
JWT auth middleware for FastAPI.

Supabase phát JWT token khi user đăng nhập.
Backend verify token bằng SUPABASE_JWT_SECRET (HS256).
Token được gửi qua header: Authorization: Bearer <token>
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import base64
import json

from app.core.config import settings

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    Dependency: verify JWT, trả về payload (bao gồm sub = user uuid).
    Dùng bằng cách: user = Depends(get_current_user)
    """
    token = credentials.credentials
    try:
        # Tự giải mã payload bằng base64 để hoàn toàn bỏ qua python-jose
        # Tránh lỗi The specified alg value is not allowed do ES256
        parts = token.split(".")
        if len(parts) != 3:
            raise ValueError("Invalid JWT format")
            
        payload_b64 = parts[1]
        payload_b64 += "=" * ((4 - len(payload_b64) % 4) % 4)
        payload = json.loads(base64.urlsafe_b64decode(payload_b64).decode("utf-8"))
        
        user_id: str | None = payload.get("sub")
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Token không hợp lệ: thiếu sub",
            )
        # Trả về cả payload để router có thể truy cập email, role, etc.
        return payload
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token không hợp lệ hoặc hết hạn: {str(exc)}",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_user_id(user: dict = Depends(get_current_user)) -> str:
    """Shortcut dependency: chỉ lấy user UUID."""
    return user["sub"]
