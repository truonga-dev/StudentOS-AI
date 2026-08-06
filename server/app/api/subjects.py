from fastapi import APIRouter, Depends, HTTPException, status
from app.core.auth import get_user_id
from app.core.supabase_client import get_supabase, get_user_supabase
from supabase import Client
from app.schemas.schemas import SubjectCreate, SubjectOut, SubjectUpdate

router = APIRouter(prefix="/subjects", tags=["subjects"])


@router.get("/", response_model=list[SubjectOut])
async def list_subjects(user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """Lấy tất cả môn học của user hiện tại."""
    res = sb.table("subjects").select("*").eq("user_id", user_id).order("created_at").execute()
    return res.data


@router.post("/", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
async def create_subject(body: SubjectCreate, user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """Tạo môn học mới."""
    res = sb.table("subjects").insert({**body.model_dump(), "user_id": user_id}).execute()
    if not res.data:
        raise HTTPException(status_code=500, detail="Không tạo được môn học")
    return res.data[0]


@router.patch("/{subject_id}", response_model=SubjectOut)
async def update_subject(
    subject_id: str,
    body: SubjectUpdate,
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase)
):
    """Cập nhật môn học (chỉ các trường được gửi)."""
    data = body.model_dump(exclude_none=True)
    if not data:
        raise HTTPException(status_code=400, detail="Không có dữ liệu cập nhật")
    res = (
        sb.table("subjects")
        .update(data)
        .select("*")
        .eq("id", subject_id)
        .eq("user_id", user_id)  # Đảm bảo chỉ cập nhật subject của mình
        .execute()
    )
    if not res.data:
        raise HTTPException(status_code=404, detail="Không tìm thấy môn học")
    return res.data[0]


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(subject_id: str, user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """Xóa môn học."""
    sb.table("subjects").delete().eq("id", subject_id).eq("user_id", user_id).execute()
