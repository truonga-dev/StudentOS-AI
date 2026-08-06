"""
Supabase Admin client (Service Role).
Dùng service key nên có thể bypass RLS — chỉ dùng server-side.
"""
from functools import lru_cache
from supabase import create_client, Client
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from app.core.config import settings

security = HTTPBearer()

@lru_cache(maxsize=1)
def get_supabase_admin() -> Client:
    """Admin client dùng để verify token qua Supabase Auth API."""
    return create_client(settings.supabase_url, settings.supabase_service_key)

@lru_cache(maxsize=1)
def get_supabase() -> Client:
    """Admin client (Service Role) - Bypasses RLS. Use with caution."""
    return create_client(settings.supabase_url, settings.supabase_service_key)

def get_user_supabase(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Client:
    """User client - Enforces RLS by overriding the Authorization header with the user's JWT."""
    from supabase import ClientOptions
    token = credentials.credentials
    return create_client(
        settings.supabase_url,
        settings.supabase_service_key,
        options=ClientOptions(headers={"Authorization": f"Bearer {token}"})
    )
