from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from app.core.auth import get_user_id
from app.core.supabase_client import get_supabase, get_user_supabase
from supabase import Client
from app.schemas.schemas import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("/", response_model=list[TaskOut])
async def list_tasks(
    completed: bool | None = Query(default=None, description="Lọc theo trạng thái"),
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase)
):
    """Lấy danh sách tasks. Tùy chọn lọc theo completed."""
    query = sb.table("tasks").select("*, subjects(title, color)").eq("user_id", user_id)
    if completed is not None:
        query = query.eq("completed", completed)
    res = query.order("due_date", desc=False, nullsfirst=False).execute()
    return res.data


@router.get("/upcoming", response_model=list[TaskOut])
async def upcoming_tasks(
    limit: int = Query(default=5, ge=1, le=20),
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase)
):
    """Tasks sắp tới: chưa hoàn thành, có due_date, limit N."""
    res = (
        sb.table("tasks")
        .select("*, subjects(title, color)")
        .eq("user_id", user_id)
        .eq("completed", False)
        .not_.is_("due_date", "null")
        .gte("due_date", datetime.now(timezone.utc).isoformat())
        .order("due_date")
        .limit(limit)
        .execute()
    )
    return res.data


@router.post("/", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(body: TaskCreate, user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """Tạo task mới."""
    payload = body.model_dump(mode="json")
    payload["user_id"] = user_id
    res = sb.table("tasks").insert(payload).select("*, subjects(title, color)").execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không tạo được task")
    return res.data[0]


@router.patch("/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: str,
    body: TaskUpdate,
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase)
):
    """Cập nhật task (bao gồm toggle completed)."""
    data = body.model_dump(exclude_none=True, mode="json")
    if not data:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cập nhật")
    res = (
        sb.table("tasks")
        .update(data)
        .eq("id", task_id)
        .eq("user_id", user_id)
        .select("*, subjects(title, color)")
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy task")
    return res.data[0]


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(task_id: str, user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """Xóa task."""
    sb.table("tasks").delete().eq("id", task_id).eq("user_id", user_id).execute()
