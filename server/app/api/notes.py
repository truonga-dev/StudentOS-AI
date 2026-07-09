from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_user_id
from app.core.supabase_client import get_supabase
from app.schemas.schemas import NoteCreate, NoteOut, NoteUpdate

router = APIRouter(prefix="/notes", tags=["notes"])


@router.get("/", response_model=list[NoteOut])
async def list_notes(user_id: str = Depends(get_user_id)):
    """Lấy tất cả ghi chú, sắp xếp theo updated_at mới nhất."""
    sb = get_supabase()
    res = (
        sb.table("notes")
        .select("*, subjects(title, color)")
        .eq("user_id", user_id)
        .order("updated_at", desc=True)
        .execute()
    )
    return res.data


@router.get("/{note_id}", response_model=NoteOut)
async def get_note(note_id: str, user_id: str = Depends(get_user_id)):
    """Lấy chi tiết 1 ghi chú."""
    sb = get_supabase()
    res = sb.table("notes").select("*, subjects(title, color)").eq("id", note_id).eq("user_id", user_id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy ghi chú")
    return res.data[0]


@router.post("/", response_model=NoteOut, status_code=status.HTTP_201_CREATED)
async def create_note(body: NoteCreate, user_id: str = Depends(get_user_id)):
    """Tạo ghi chú mới."""
    sb = get_supabase()
    payload = body.model_dump(mode="json")
    payload["user_id"] = user_id
    res = sb.table("notes").insert(payload).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không tạo được ghi chú")
    
    # Lấy lại bản ghi vừa tạo kèm theo subject
    new_note = sb.table("notes").select("*, subjects(title, color)").eq("id", res.data[0]["id"]).execute()
    return new_note.data[0]


@router.patch("/{note_id}", response_model=NoteOut)
async def update_note(
    note_id: str,
    body: NoteUpdate,
    user_id: str = Depends(get_user_id),
):
    """Cập nhật ghi chú và tự động set updated_at."""
    sb = get_supabase()
    data = body.model_dump(exclude_unset=True, mode="json")
    if not data:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cập nhật")
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = (
        sb.table("notes")
        .update(data)
        .eq("id", note_id)
        .eq("user_id", user_id)
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy ghi chú")
        
    # Lấy lại bản ghi vừa update kèm theo subject
    updated_note = sb.table("notes").select("*, subjects(title, color)").eq("id", note_id).execute()
    return updated_note.data[0]


@router.delete("/{note_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_note(note_id: str, user_id: str = Depends(get_user_id)):
    """Xóa ghi chú."""
    sb = get_supabase()
    sb.table("notes").delete().eq("id", note_id).eq("user_id", user_id).execute()
