from datetime import datetime
from uuid import UUID
from pydantic import BaseModel


# ─── Subject ──────────────────────────────────────────────────────────────────

class SubjectBase(BaseModel):
    title: str
    color: str = "#6366f1"
    credits: int = 3
    semester: str = "1"


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    title: str | None = None
    color: str | None = None
    credits: int | None = None
    semester: str | None = None


class SubjectOut(SubjectBase):
    id: UUID
    user_id: UUID
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Task ─────────────────────────────────────────────────────────────────────

class TaskBase(BaseModel):
    title: str
    description: str | None = None
    due_date: datetime | None = None
    priority: str = "medium"
    subject_id: UUID | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    due_date: datetime | None = None
    priority: str | None = None
    subject_id: UUID | None = None
    completed: bool | None = None


class TaskOut(TaskBase):
    id: UUID
    user_id: UUID
    completed: bool
    created_at: datetime

    model_config = {"from_attributes": True}


# ─── Note ─────────────────────────────────────────────────────────────────────

class NoteBase(BaseModel):
    title: str
    content: str = ""
    subject_id: UUID | None = None
    icon: str | None = None
    cover_image: str | None = None


class NoteCreate(NoteBase):
    pass


class NoteUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    subject_id: UUID | None = None
    icon: str | None = None
    cover_image: str | None = None


class NoteOut(NoteBase):
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime
    subjects: dict | None = None

    model_config = {"from_attributes": True}
