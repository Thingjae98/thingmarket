from supabase import create_client, Client
from app.core.config import settings

# 일반 쿼리용 (RLS 적용)
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_ANON_KEY)

# 서버 전용 쿼리용 (RLS 우회 — 관리자 작업, 트리거 등)
supabase_admin: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
