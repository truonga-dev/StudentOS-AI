from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

from app.core.auth import get_user_id
from app.core.supabase_client import get_supabase, get_user_supabase
from supabase import Client

router = APIRouter(prefix="/gpa", tags=["gpa"])

class GradeCreate(BaseModel):
    subject_id: str
    title: str
    score: float = Field(..., ge=0, le=10)
    weight: float = Field(..., gt=0, le=1)
    date: Optional[str] = None

class GradeOut(BaseModel):
    id: str
    subject_id: str
    title: str
    score: float
    weight: float
    date: str
    created_at: str

@router.get("/grades", response_model=List[GradeOut])
async def list_grades(subject_id: Optional[str] = None, user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """Lấy danh sách điểm số. Có thể lọc theo subject_id."""
    query = sb.table("grades").select("*").eq("user_id", user_id)
    if subject_id:
        query = query.eq("subject_id", subject_id)
    
    try:
        res = query.order("date", desc=True).execute()
        return res.data
    except Exception as e:
        print(f"Error fetching grades: {e}")
        return []

@router.post("/grades", response_model=GradeOut, status_code=status.HTTP_201_CREATED)
async def create_grade(body: GradeCreate, user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """Thêm một cột điểm mới."""
    payload = body.model_dump(exclude_none=True, mode="json")
    payload["user_id"] = user_id
    
    try:
        res = sb.table("grades").insert(payload).execute()
        if not res.data:
            raise HTTPException(status_code=500, detail="Không tạo được điểm số")
        return res.data[0]
    except Exception as e:
        print(f"Error creating grade: {e}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

@router.delete("/grades/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(grade_id: str, user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """Xóa cột điểm."""
    try:
        sb.table("grades").delete().eq("id", grade_id).eq("user_id", user_id).execute()
    except Exception as e:
        print(f"Error deleting grade: {e}")

@router.get("/summary")
async def get_gpa_summary(user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    """
    Tính toán GPA hệ 10 và hệ 4 của từng học kỳ và tổng quát.
    GPA tổng quát = Tổng (Điểm trung bình môn * Tín chỉ) / Tổng số tín chỉ
    Điểm trung bình môn = Tổng (Score * Weight)
    """
    
    # 1. Fetch all subjects
    subjects_res = sb.table("subjects").select("*").eq("user_id", user_id).execute()
    subjects = {s["id"]: s for s in subjects_res.data}
    
    if not subjects:
        return {"gpa_10": 0, "gpa_4": 0, "total_credits": 0, "subjects": []}
        
    # 2. Fetch all grades
    try:
        grades_res = sb.table("grades").select("*").eq("user_id", user_id).execute()
        grades = grades_res.data
    except Exception as e:
        print(f"Error fetching grades for summary: {e}")
        grades = []
    
    # 3. Calculate avg per subject
    # Trọng số có thể chưa đủ 1.0 (ví dụ mới có điểm giữa kỳ 30%). 
    # Điểm trung bình tạm thời = (Tổng điểm * trọng số) / (Tổng trọng số hiện tại)
    subject_scores = {}
    for g in grades:
        sid = g["subject_id"]
        if sid not in subject_scores:
            subject_scores[sid] = {"total_weighted": 0, "total_weight": 0}
        subject_scores[sid]["total_weighted"] += g["score"] * g["weight"]
        subject_scores[sid]["total_weight"] += g["weight"]
        
    total_gpa_10_points = 0
    total_credits = 0
    subject_details = []
    
    for sid, subj in subjects.items():
        credits = subj.get("credits", 3)
        if sid in subject_scores and subject_scores[sid]["total_weight"] > 0:
            # Avg for this subject (Hệ 10)
            subj_avg_10 = subject_scores[sid]["total_weighted"] / subject_scores[sid]["total_weight"]
            
            total_gpa_10_points += subj_avg_10 * credits
            total_credits += credits
            
            # Đổi hệ 10 sang hệ 4 (Quy đổi cơ bản)
            if subj_avg_10 >= 8.5: subj_gpa_4 = 4.0
            elif subj_avg_10 >= 8.0: subj_gpa_4 = 3.5
            elif subj_avg_10 >= 7.0: subj_gpa_4 = 3.0
            elif subj_avg_10 >= 6.5: subj_gpa_4 = 2.5
            elif subj_avg_10 >= 5.5: subj_gpa_4 = 2.0
            elif subj_avg_10 >= 5.0: subj_gpa_4 = 1.5
            elif subj_avg_10 >= 4.0: subj_gpa_4 = 1.0
            else: subj_gpa_4 = 0.0
            
            subject_details.append({
                "subject_id": sid,
                "title": subj.get("title"),
                "semester": subj.get("semester"),
                "credits": credits,
                "average_10": round(subj_avg_10, 2),
                "gpa_4": subj_gpa_4,
                "status": "pass" if subj_avg_10 >= 4.0 else "fail",
                "has_grades": True
            })
        else:
            subject_details.append({
                "subject_id": sid,
                "title": subj.get("title"),
                "semester": subj.get("semester"),
                "credits": credits,
                "average_10": 0.0,
                "gpa_4": 0.0,
                "status": "none",
                "has_grades": False
            })
            
    if total_credits == 0:
        return {"gpa_10": 0, "gpa_4": 0, "total_credits": 0, "subjects": subject_details}
        
    final_gpa_10 = total_gpa_10_points / total_credits
    
    # Calculate total GPA 4
    total_gpa_4_points = sum(s["gpa_4"] * s["credits"] for s in subject_details)
    final_gpa_4 = total_gpa_4_points / total_credits
    
    return {
        "gpa_10": round(final_gpa_10, 2),
        "gpa_4": round(final_gpa_4, 2),
        "total_credits": total_credits,
        "subjects": subject_details
    }
