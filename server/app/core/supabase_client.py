"""
Supabase Admin client (Service Role).
Dùng service key nên có thể bypass RLS — chỉ dùng server-side.
"""
from functools import lru_cache
from supabase import create_client, Client
from app.core.config import settings


@lru_cache(maxsize=1)
def get_supabase() -> Client:
    return create_client(settings.supabase_url, settings.supabase_service_key)
