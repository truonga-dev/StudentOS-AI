"""
Admin API — hệ thống quản trị độc lập (/admin trên frontend).

Nhóm endpoint:
  1. /admin/me                 — xác minh quyền admin (dùng cho trang đăng nhập admin)
  2. /admin/stats, /analytics  — thống kê & biểu đồ
  3. /admin/users              — quản lý người dùng
  4. /admin/reports            — kiểm duyệt báo cáo vi phạm
  5. /admin/channels, messages — quản lý cộng đồng
  6. /admin/content            — quản lý nội dung học tập (subjects/tasks/notes/flashcards/files)
  7. /admin/broadcast          — thông báo toàn hệ thống + lịch sử
  8. /admin/audit-logs         — nhật ký thao tác admin
  9. /admin/settings           — cài đặt hệ thống
"""
from datetime import datetime, timedelta, timezone
from collections import Counter
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from supabase import Client

from app.core.auth import require_admin, require_admin_info
from app.core.supabase_client import get_supabase

router = APIRouter(prefix="/admin", tags=["admin"])


# ─── Schemas ──────────────────────────────────────────────────────────────────

class UserUpdateAdmin(BaseModel):
    role: Optional[str] = None
    is_banned: Optional[bool] = None
    xp: Optional[int] = None
    points: Optional[int] = None
    level: Optional[int] = None
    rank_tier: Optional[str] = None
    full_name: Optional[str] = None


class ReportUpdateAdmin(BaseModel):
    status: str  # 'pending' | 'resolved' | 'dismissed'
    delete_message: bool = False
    ban_reported_user: bool = False


class BroadcastCreate(BaseModel):
    title: str
    message: str
    type: str = "info"  # 'info' | 'success' | 'warning' | 'error'
    link: Optional[str] = None
    target: str = "all"  # 'all' | 'users' | 'admins'


class ChannelUpdateAdmin(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    is_global: Optional[bool] = None
    is_archived: Optional[bool] = None


class SettingsUpdate(BaseModel):
    settings: dict[str, Any]


CONTENT_TABLES = {
    "subjects": "subjects",
    "tasks": "tasks",
    "notes": "notes",
    "flashcards": "flashcards",
    "files": "files",
}

ALLOWED_SETTINGS = {
    "maintenance_mode",
    "registration_enabled",
    "community_enabled",
    "ai_enabled",
    "announcement_banner",
    "ai_daily_limit",
    "max_upload_mb",
}


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _log(sb: Client, admin: dict, action: str, target_type: str | None = None,
         target_id: str | None = None, details: dict | None = None) -> None:
    """Ghi audit log — không bao giờ làm hỏng request chính nếu bảng chưa tồn tại."""
    try:
        sb.table("admin_audit_logs").insert({
            "admin_id": admin["id"],
            "admin_email": admin.get("email"),
            "action": action,
            "target_type": target_type,
            "target_id": target_id,
            "details": details or {},
        }).execute()
    except Exception:
        pass


def _attach_owners(sb: Client, rows: list[dict], key: str = "user_id") -> list[dict]:
    """Gắn thông tin profile (owner) vào mỗi bản ghi theo user_id."""
    ids = list({r.get(key) for r in rows if r.get(key)})
    if not ids:
        return rows
    try:
        res = sb.table("profiles").select("id, email, full_name, avatar_url").in_("id", ids).execute()
        by_id = {p["id"]: p for p in (res.data or [])}
    except Exception:
        by_id = {}
    for r in rows:
        r["owner"] = by_id.get(r.get(key))
    return rows


def _safe_count(sb: Client, table: str, col: str | None = None, val: object = None,
                gte_col: str | None = None, gte_val: str | None = None) -> int:
    try:
        q = sb.table(table).select("id", count="exact")
        if col is not None:
            q = q.eq(col, val)
        if gte_col is not None:
            q = q.gte(gte_col, gte_val)
        res = q.limit(1).execute()
        return res.count if res.count is not None else len(res.data or [])
    except Exception:
        return 0


# ─── 1. Xác minh admin ───────────────────────────────────────────────────────

@router.get("/me")
async def admin_me(
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    """Trả về profile admin hiện tại. 403 nếu không phải admin."""
    try:
        res = sb.table("profiles").select("*").eq("id", admin["id"]).maybe_single().execute()
        profile = res.data if res else None
    except Exception:
        profile = None
    _log(sb, admin, "admin.session_check", "admin", admin["id"])
    return profile or {"id": admin["id"], "email": admin["email"], "role": "admin"}


# ─── 2. Thống kê & Analytics ─────────────────────────────────────────────────

@router.get("/stats")
async def get_system_stats(
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    """Lấy số liệu thống kê toàn hệ thống cho Admin Dashboard."""
    week_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()

    total_study_minutes = 0
    total_sessions = 0
    try:
        sessions_res = sb.table("study_sessions").select("duration_minutes").execute()
        if sessions_res.data:
            total_sessions = len(sessions_res.data)
            total_study_minutes = sum(s.get("duration_minutes", 0) or 0 for s in sessions_res.data)
    except Exception:
        pass

    recent_users = []
    try:
        ru_res = (
            sb.table("profiles")
            .select("id, email, full_name, avatar_url, role, xp, level, rank_tier, created_at")
            .order("created_at", desc=True)
            .limit(6)
            .execute()
        )
        recent_users = ru_res.data or []
    except Exception:
        pass

    top_users = []
    try:
        tu_res = (
            sb.table("profiles")
            .select("id, email, full_name, avatar_url, xp, level, rank_tier")
            .order("xp", desc=True)
            .limit(5)
            .execute()
        )
        top_users = tu_res.data or []
    except Exception:
        pass

    return {
        "users": {
            "total": _safe_count(sb, "profiles"),
            "admins": _safe_count(sb, "profiles", "role", "admin"),
            "banned": _safe_count(sb, "profiles", "is_banned", True),
            "new_7d": _safe_count(sb, "profiles", gte_col="created_at", gte_val=week_ago),
        },
        "academic": {
            "subjects": _safe_count(sb, "subjects"),
            "tasks": _safe_count(sb, "tasks"),
            "completed_tasks": _safe_count(sb, "tasks", "completed", True),
            "notes": _safe_count(sb, "notes"),
            "flashcards": _safe_count(sb, "flashcards"),
            "files": _safe_count(sb, "files"),
            "study_sessions": total_sessions,
            "study_minutes": total_study_minutes,
        },
        "community": {
            "channels": _safe_count(sb, "chat_channels"),
            "messages": _safe_count(sb, "community_messages"),
            "messages_7d": _safe_count(sb, "community_messages", gte_col="created_at", gte_val=week_ago),
            "pending_reports": _safe_count(sb, "reports", "status", "pending"),
            "total_reports": _safe_count(sb, "reports"),
        },
        "recent_users": recent_users,
        "top_users": top_users,
    }


@router.get("/analytics")
async def get_analytics(
    days: int = Query(default=30, ge=7, le=180),
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    """Dữ liệu chuỗi thời gian: đăng ký mới, phút học, tin nhắn, task tạo mới theo ngày."""
    start = datetime.now(timezone.utc) - timedelta(days=days - 1)
    start_iso = start.replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    def bucket(table: str, date_col: str, value_col: str | None = None) -> Counter:
        counter: Counter = Counter()
        try:
            cols = date_col + (f", {value_col}" if value_col else "")
            res = sb.table(table).select(cols).gte(date_col, start_iso).limit(20000).execute()
            for row in res.data or []:
                d = (row.get(date_col) or "")[:10]
                if not d:
                    continue
                counter[d] += (row.get(value_col) or 0) if value_col else 1
        except Exception:
            pass
        return counter

    signups = bucket("profiles", "created_at")
    minutes = bucket("study_sessions", "started_at", "duration_minutes")
    messages = bucket("community_messages", "created_at")
    tasks = bucket("tasks", "created_at")

    series = []
    for i in range(days):
        d = (start + timedelta(days=i)).strftime("%Y-%m-%d")
        series.append({
            "date": d,
            "signups": signups.get(d, 0),
            "study_minutes": minutes.get(d, 0),
            "messages": messages.get(d, 0),
            "tasks": tasks.get(d, 0),
        })

    # Phân bố rank
    rank_dist: Counter = Counter()
    try:
        res = sb.table("profiles").select("rank_tier").execute()
        for r in res.data or []:
            rank_dist[r.get("rank_tier") or "Unranked"] += 1
    except Exception:
        pass

    return {
        "series": series,
        "rank_distribution": [{"name": k, "value": v} for k, v in rank_dist.most_common()],
    }


# ─── 3. Quản lý Người dùng ───────────────────────────────────────────────────

@router.get("/users")
async def list_users(
    search: Optional[str] = Query(default=None),
    role: Optional[str] = Query(default=None),
    banned: Optional[bool] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    """Lấy danh sách người dùng (lọc theo role, trạng thái khóa, tìm kiếm)."""
    query = sb.table("profiles").select("*")
    if role in ("user", "admin"):
        query = query.eq("role", role)
    if banned is not None:
        query = query.eq("is_banned", banned)
    if search:
        query = query.or_(f"email.ilike.%{search}%,full_name.ilike.%{search}%")
    res = query.order("created_at", desc=True).limit(limit).execute()
    return res.data or []


@router.get("/users/{target_user_id}")
async def get_user_detail(
    target_user_id: str,
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    """Chi tiết 1 người dùng + thống kê hoạt động."""
    res = sb.table("profiles").select("*").eq("id", target_user_id).maybe_single().execute()
    profile = res.data if res else None
    if not profile:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    minutes = 0
    try:
        ss = sb.table("study_sessions").select("duration_minutes").eq("user_id", target_user_id).execute()
        minutes = sum(s.get("duration_minutes") or 0 for s in ss.data or [])
    except Exception:
        pass

    return {
        "profile": profile,
        "stats": {
            "subjects": _safe_count(sb, "subjects", "user_id", target_user_id),
            "tasks": _safe_count(sb, "tasks", "user_id", target_user_id),
            "notes": _safe_count(sb, "notes", "user_id", target_user_id),
            "flashcards": _safe_count(sb, "flashcards", "user_id", target_user_id),
            "files": _safe_count(sb, "files", "user_id", target_user_id),
            "messages": _safe_count(sb, "community_messages", "user_id", target_user_id),
            "reports_against": _safe_count(sb, "reports", "reported_user_id", target_user_id),
            "study_minutes": minutes,
        },
    }


@router.patch("/users/{target_user_id}")
async def update_user_admin(
    target_user_id: str,
    body: UserUpdateAdmin,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    """Cập nhật quyền, khóa/mở khóa, điểm XP, level..."""
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cập nhật")
    if "role" in updates and updates["role"] not in ("user", "admin"):
        raise HTTPException(status_code=400, detail="Role không hợp lệ")

    if target_user_id == admin["id"]:
        if updates.get("role") == "user":
            raise HTTPException(status_code=400, detail="Không thể tự hạ quyền Admin của chính mình")
        if updates.get("is_banned") is True:
            raise HTTPException(status_code=400, detail="Không thể tự khóa tài khoản của chính mình")

    res = sb.table("profiles").update(updates).eq("id", target_user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy người dùng")

    action = "user.update"
    if "is_banned" in updates:
        action = "user.ban" if updates["is_banned"] else "user.unban"
    elif "role" in updates:
        action = "user.promote" if updates["role"] == "admin" else "user.demote"
    _log(sb, admin, action, "user", target_user_id, updates)
    return res.data[0]


@router.delete("/users/{target_user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user_admin(
    target_user_id: str,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    """Xóa người dùng khỏi hệ thống (Auth + Profile)."""
    if target_user_id == admin["id"]:
        raise HTTPException(status_code=400, detail="Không thể tự xóa tài khoản của chính mình")

    email = None
    try:
        p = sb.table("profiles").select("email").eq("id", target_user_id).maybe_single().execute()
        email = p.data.get("email") if p and p.data else None
    except Exception:
        pass
    try:
        sb.auth.admin.delete_user(target_user_id)
    except Exception:
        pass
    sb.table("profiles").delete().eq("id", target_user_id).execute()
    _log(sb, admin, "user.delete", "user", target_user_id, {"email": email})


# ─── 4. Báo cáo vi phạm ──────────────────────────────────────────────────────

@router.get("/reports")
async def list_reports(
    status_filter: Optional[str] = Query(default=None, alias="status"),
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    """Danh sách báo cáo kèm reporter, reported user, tin nhắn."""
    query = sb.table("reports").select(
        "*, "
        "reporter:profiles!reports_reporter_id_fkey(id, email, full_name, avatar_url), "
        "reported_user:profiles!reports_reported_user_id_fkey(id, email, full_name, avatar_url, is_banned), "
        "message:community_messages!reports_message_id_fkey(id, content, channel_id, is_deleted, created_at)"
    )
    if status_filter in ("pending", "resolved", "dismissed"):
        query = query.eq("status", status_filter)

    try:
        res = query.order("created_at", desc=True).execute()
        return res.data or []
    except Exception:
        fallback_q = sb.table("reports").select("*").order("created_at", desc=True)
        if status_filter in ("pending", "resolved", "dismissed"):
            fallback_q = fallback_q.eq("status", status_filter)
        res = fallback_q.execute()
        return res.data or []


@router.patch("/reports/{report_id}")
async def handle_report(
    report_id: str,
    body: ReportUpdateAdmin,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    """Xử lý báo cáo: đổi trạng thái, xóa tin nhắn, khóa người vi phạm."""
    if body.status not in ("pending", "resolved", "dismissed"):
        raise HTTPException(status_code=400, detail="Trạng thái không hợp lệ")

    report_res = sb.table("reports").select("*").eq("id", report_id).maybe_single().execute()
    report_data = report_res.data if report_res else None
    if not report_data:
        raise HTTPException(status_code=404, detail="Không tìm thấy báo cáo")

    if body.delete_message and report_data.get("message_id"):
        sb.table("community_messages").update(
            {"is_deleted": True, "content": "[Tin nhắn đã bị Quản trị viên xóa do vi phạm tiêu chuẩn cộng đồng]", "attachments": None}
        ).eq("id", report_data["message_id"]).execute()

    if body.ban_reported_user and report_data.get("reported_user_id"):
        sb.table("profiles").update({"is_banned": True}).eq("id", report_data["reported_user_id"]).execute()

    updated = sb.table("reports").update({"status": body.status}).eq("id", report_id).execute()
    _log(sb, admin, f"report.{body.status}", "report", report_id, body.model_dump())
    return updated.data[0] if updated.data else {"id": report_id, "status": body.status}


@router.delete("/reports/{report_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_report(
    report_id: str,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    sb.table("reports").delete().eq("id", report_id).execute()
    _log(sb, admin, "report.delete", "report", report_id)


# ─── 5. Cộng đồng: Kênh & Tin nhắn ───────────────────────────────────────────

@router.get("/channels")
async def list_channels_admin(
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    try:
        res = (
            sb.table("chat_channels")
            .select("*, chat_members(count), community_messages(count)")
            .order("created_at", desc=True)
            .execute()
        )
        rows = res.data or []
    except Exception:
        rows = sb.table("chat_channels").select("*").order("created_at", desc=True).execute().data or []
    return _attach_owners(sb, rows, "creator_id")


@router.patch("/channels/{channel_id}")
async def update_channel_admin(
    channel_id: str,
    body: ChannelUpdateAdmin,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    updates = body.model_dump(exclude_none=True)
    if not updates:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cập nhật")
    res = sb.table("chat_channels").update(updates).eq("id", channel_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy kênh chat")
    _log(sb, admin, "channel.update", "channel", channel_id, updates)
    return res.data[0]


@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_channel_admin(
    channel_id: str,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    sb.table("chat_channels").delete().eq("id", channel_id).execute()
    _log(sb, admin, "channel.delete", "channel", channel_id)


@router.get("/messages")
async def list_messages_admin(
    channel_id: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    """Tin nhắn cộng đồng mới nhất (lọc theo kênh / từ khóa)."""
    q = sb.table("community_messages").select("*")
    if channel_id:
        q = q.eq("channel_id", channel_id)
    if search:
        q = q.ilike("content", f"%{search}%")
    rows = q.order("created_at", desc=True).limit(limit).execute().data or []
    return _attach_owners(sb, rows, "user_id")


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message_admin(
    message_id: str,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    """Ẩn (soft delete) một tin nhắn cộng đồng."""
    sb.table("community_messages").update(
        {"is_deleted": True, "content": "[Tin nhắn đã bị Quản trị viên xóa]", "attachments": None}
    ).eq("id", message_id).execute()
    _log(sb, admin, "message.delete", "message", message_id)


# ─── 6. Nội dung học tập ─────────────────────────────────────────────────────

@router.get("/content/{content_type}")
async def list_content(
    content_type: str,
    search: Optional[str] = Query(default=None),
    user_id: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    table = CONTENT_TABLES.get(content_type)
    if not table:
        raise HTTPException(status_code=400, detail="Loại nội dung không hợp lệ")

    q = sb.table(table).select("*")
    if user_id:
        q = q.eq("user_id", user_id)
    if search:
        col = {"flashcards": "question", "files": "name"}.get(content_type, "title")
        q = q.ilike(col, f"%{search}%")
    try:
        rows = q.order("created_at", desc=True).limit(limit).execute().data or []
    except Exception:
        rows = q.limit(limit).execute().data or []
    return _attach_owners(sb, rows, "user_id")


@router.delete("/content/{content_type}/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_content(
    content_type: str,
    item_id: str,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    table = CONTENT_TABLES.get(content_type)
    if not table:
        raise HTTPException(status_code=400, detail="Loại nội dung không hợp lệ")

    if content_type == "files":
        try:
            f = sb.table("files").select("storage_path").eq("id", item_id).maybe_single().execute()
            path = f.data.get("storage_path") if f and f.data else None
            if path:
                sb.storage.from_("files").remove([path])
        except Exception:
            pass

    sb.table(table).delete().eq("id", item_id).execute()
    _log(sb, admin, f"content.delete", content_type, item_id)


# ─── 7. Thông báo toàn hệ thống ──────────────────────────────────────────────

@router.post("/broadcast", status_code=status.HTTP_201_CREATED)
async def broadcast_notification(
    body: BroadcastCreate,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    if not body.title.strip() or not body.message.strip():
        raise HTTPException(status_code=400, detail="Tiêu đề và nội dung không được để trống")

    q = sb.table("profiles").select("id")
    if body.target == "admins":
        q = q.eq("role", "admin")
    elif body.target == "users":
        q = q.eq("role", "user")
    users = q.execute().data or []

    ntype = body.type if body.type in ("info", "success", "warning", "error") else "info"
    payloads = [
        {"user_id": u["id"], "title": body.title.strip(), "message": body.message.strip(),
         "type": ntype, "link": body.link}
        for u in users
    ]
    for i in range(0, len(payloads), 500):
        sb.table("notifications").insert(payloads[i:i + 500]).execute()

    try:
        sb.table("admin_broadcasts").insert({
            "admin_id": admin["id"], "title": body.title.strip(), "message": body.message.strip(),
            "type": ntype, "link": body.link, "target": body.target, "sent_count": len(payloads),
        }).execute()
    except Exception:
        pass
    _log(sb, admin, "broadcast.send", "broadcast", None, {"title": body.title, "target": body.target, "sent": len(payloads)})
    return {"sent_count": len(payloads), "title": body.title}


@router.get("/broadcasts")
async def list_broadcasts(
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    try:
        return sb.table("admin_broadcasts").select("*").order("created_at", desc=True).limit(100).execute().data or []
    except Exception:
        return []


# ─── 8. Audit logs ───────────────────────────────────────────────────────────

@router.get("/audit-logs")
async def list_audit_logs(
    action: Optional[str] = Query(default=None),
    limit: int = Query(default=200, ge=1, le=1000),
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    try:
        q = sb.table("admin_audit_logs").select("*")
        if action:
            q = q.ilike("action", f"{action}%")
        return q.order("created_at", desc=True).limit(limit).execute().data or []
    except Exception:
        return []


# ─── 9. Cài đặt hệ thống ─────────────────────────────────────────────────────

@router.get("/settings")
async def get_settings(
    _admin_id: str = Depends(require_admin),
    sb: Client = Depends(get_supabase),
):
    try:
        rows = sb.table("system_settings").select("*").execute().data or []
        return {r["key"]: r["value"] for r in rows}
    except Exception:
        return {}


@router.put("/settings")
async def update_settings(
    body: SettingsUpdate,
    admin: dict = Depends(require_admin_info),
    sb: Client = Depends(get_supabase),
):
    rows = [
        {"key": k, "value": v, "updated_by": admin["id"], "updated_at": datetime.now(timezone.utc).isoformat()}
        for k, v in body.settings.items() if k in ALLOWED_SETTINGS
    ]
    if not rows:
        raise HTTPException(status_code=400, detail="Không có cài đặt hợp lệ")
    sb.table("system_settings").upsert(rows).execute()
    _log(sb, admin, "settings.update", "settings", None, {r["key"]: r["value"] for r in rows})
    return {r["key"]: r["value"] for r in rows}
