from fastapi import APIRouter, Depends, HTTPException, Body, Request
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict
from pydantic import BaseModel
import json
import re
import base64

from app.core.limiter import limiter
from fastapi_cache.decorator import cache
from app.core.config import settings
from app.core.auth import get_user_id
from app.core.prompts import CHAT_SYSTEM_PROMPT, PROMPTS_CONFIG, get_prompt_section, render_prompt
from app.core.supabase_client import get_supabase, get_user_supabase
from supabase import Client
import google.generativeai as genai

try:
    from groq import Groq
except ImportError:
    Groq = None

router = APIRouter(prefix="/ai", tags=["ai"])

# ── Gemini Setup ──────────────────────────────────────────────────────────────
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)
    model = genai.GenerativeModel(
        PROMPTS_CONFIG["metadata"]["models"]["multimodal_vision"],
        system_instruction=CHAT_SYSTEM_PROMPT,
    )
else:
    model = None

# ── Groq Setup ───────────────────────────────────────────────────────────────
if settings.groq_api_key and Groq:
    groq_client = Groq(api_key=settings.groq_api_key)
else:
    groq_client = None


@router.get("/prompts")
async def get_ai_prompts_config():
    """Trả về bộ cấu hình JSON Prompt chuẩn dành riêng cho dự án Student OS AI."""
    return PROMPTS_CONFIG


async def generate_text_with_fallback(prompt: str, system_prompt: Optional[str] = None) -> str:
    """Ưu tiên gọi Groq (phản hồi ~1 giây), nếu lỗi thì fallback sang Gemini."""
    if not groq_client and not model:
        raise HTTPException(status_code=500, detail="AI API Key is not configured")

    sys_instruction = system_prompt or CHAT_SYSTEM_PROMPT

    if groq_client:
        try:
            groq_resp = groq_client.chat.completions.create(
                model=PROMPTS_CONFIG["metadata"]["models"]["fast_stream"],
                messages=[
                    {"role": "system", "content": sys_instruction},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.5,
            )
            content = groq_resp.choices[0].message.content
            if content:
                return content
        except Exception as groq_err:
            print(f"Groq primary error: {groq_err}")

    if model:
        try:
            response = model.generate_content(prompt, request_options={"timeout": 12})
            return response.text
        except Exception as e:
            error_msg = str(e)
            print(f"Gemini error: {error_msg}")
            raise HTTPException(status_code=500, detail=f"Lỗi kết nối AI: {error_msg}")

    raise HTTPException(status_code=500, detail="Không thể kết nối tới dịch vụ AI")


class FlashcardSchema(BaseModel):
    question: str
    answer: str


class FlashcardListSchema(BaseModel):
    flashcards: list[FlashcardSchema]


class QuizOptionSchema(BaseModel):
    question: str
    options: list[str]
    correct_index: int
    explanation: str


class QuizListSchema(BaseModel):
    quiz: list[QuizOptionSchema]


class MockTestMultipleChoiceSchema(BaseModel):
    question: str
    options: list[str]
    correct_answer: int


class MockTestSchema(BaseModel):
    multiple_choice: list[MockTestMultipleChoiceSchema]
    essay: list[str]


class GradeEssaySchema(BaseModel):
    score: float
    feedback: str


def extract_json_from_text(text: str) -> str:
    """Trích xuất chuỗi JSON từ phản hồi của AI."""
    text = text.strip()
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.DOTALL)
    if match:
        return match.group(1).strip()

    start_idx = -1
    end_idx = -1

    first_bracket = text.find("[")
    last_bracket = text.rfind("]")
    first_brace = text.find("{")
    last_brace = text.rfind("}")

    if first_bracket != -1 and first_brace != -1:
        if first_bracket < first_brace:
            start_idx = first_bracket
            end_idx = max(last_bracket, last_brace)
        else:
            start_idx = first_brace
            end_idx = max(last_bracket, last_brace)
    elif first_bracket != -1:
        start_idx = first_bracket
        end_idx = last_bracket
    elif first_brace != -1:
        start_idx = first_brace
        end_idx = last_brace

    if start_idx != -1 and end_idx != -1 and start_idx < end_idx:
        return text[start_idx : end_idx + 1]

    return text


async def generate_json_with_fallback(
    prompt: str, schema: type[BaseModel], system_prompt: Optional[str] = None
) -> dict:
    if not groq_client and not model:
        raise HTTPException(status_code=500, detail="AI API Key is not configured")

    if groq_client:
        try:
            schema_json = json.dumps(schema.model_json_schema(), ensure_ascii=False)
            sys_msg = (
                f"{system_prompt}\nReturn ONLY valid JSON matching this schema: {schema_json}"
                if system_prompt
                else f"Return ONLY valid JSON matching this schema: {schema_json}"
            )
            groq_resp = groq_client.chat.completions.create(
                model=PROMPTS_CONFIG["metadata"]["models"]["fast_stream"],
                messages=[
                    {"role": "system", "content": sys_msg},
                    {"role": "user", "content": prompt},
                ],
                temperature=0.3,
            )
            raw = groq_resp.choices[0].message.content or "{}"
            parsed = json.loads(extract_json_from_text(raw))
            if isinstance(parsed, list):
                fields = list(schema.model_fields.keys())
                if len(fields) == 1:
                    return {fields[0]: parsed}
            return parsed
        except Exception as groq_err:
            print(f"Groq JSON primary error: {groq_err}")

    if model:
        try:
            response = model.generate_content(
                prompt,
                generation_config=genai.GenerationConfig(
                    response_mime_type="application/json",
                    response_schema=schema,
                ),
                request_options={"timeout": 15},
            )
            return json.loads(response.text)
        except Exception as e:
            print(f"Gemini Structured Output Error: {e}")
            raise HTTPException(status_code=500, detail=f"Lỗi AI xử lý JSON: {e}")

    raise HTTPException(status_code=500, detail="Không thể xử lý JSON từ AI")


@router.post("/summarize")
@limiter.limit("10/minute")
@cache(expire=3600)
async def summarize_text(
    request: Request,
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id),
):
    """Tóm tắt nội dung ghi chú sử dụng cấu hình Prompt JSON của dự án."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Văn bản quá dài (tối đa 5000 ký tự)")

    prompt = render_prompt("summarize_note", text=text)
    sys_prompt = get_prompt_section("summarize_note").get("system_prompt")

    try:
        text_res = await generate_text_with_fallback(prompt, sys_prompt)
        return {"summary": text_res}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Lỗi xử lý AI")


@router.post("/suggest-tasks")
@limiter.limit("10/minute")
@cache(expire=3600)
async def suggest_tasks(
    request: Request,
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id),
):
    """Phân tích ghi chú và gợi ý các task cần làm."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Văn bản quá dài (tối đa 5000 ký tự)")

    prompt = render_prompt("suggest_tasks", text=text)
    sys_prompt = get_prompt_section("suggest_tasks").get("system_prompt")

    try:
        text_res = await generate_text_with_fallback(prompt, sys_prompt)
        return {"tasks": text_res}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Lỗi xử lý AI")


@router.post("/generate-mindmap")
@limiter.limit("10/minute")
@cache(expire=3600)
async def generate_mindmap_endpoint(
    request: Request,
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id),
):
    """Phân tích ghi chú và tạo sơ đồ tư duy dạng Mermaid (graph TD)."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Văn bản quá dài (tối đa 5000 ký tự)")

    prompt = render_prompt("generate_mindmap", text=text)
    sys_prompt = get_prompt_section("generate_mindmap").get("system_prompt")

    try:
        text_res = await generate_text_with_fallback(prompt, sys_prompt)
        clean_text = text_res.strip()

        if "graph " in clean_text:
            clean_text = clean_text[clean_text.find("graph ") :]
        elif "mindmap" in clean_text:
            clean_text = clean_text[clean_text.find("mindmap") :]

        if clean_text.startswith("```mermaid"):
            clean_text = clean_text[10:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]

        clean_text = clean_text.split("```")[0].strip()
        return {"mindmap": clean_text}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Lỗi xử lý AI")


@router.post("/generate-flashcards-from-text")
@limiter.limit("10/minute")
@cache(expire=3600)
async def generate_flashcards_from_text_endpoint(
    request: Request,
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id),
):
    """Đọc văn bản và sinh bộ flashcard (JSON)."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu văn bản")

    prompt = render_prompt("generate_flashcards_text", text=text)
    sys_prompt = get_prompt_section("generate_flashcards_text").get("system_prompt")

    try:
        data = await generate_json_with_fallback(prompt, FlashcardListSchema, sys_prompt)
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi phân tích: {str(e)}")


@router.post("/generate-quiz")
@limiter.limit("10/minute")
@cache(expire=3600)
async def generate_quiz_endpoint(
    request: Request,
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id),
):
    """Đọc văn bản và sinh bài thi trắc nghiệm (JSON)."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu văn bản")

    prompt = render_prompt("generate_quiz", text=text)
    sys_prompt = get_prompt_section("generate_quiz").get("system_prompt")

    try:
        data = await generate_json_with_fallback(prompt, QuizListSchema, sys_prompt)
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý AI: {str(e)}")


@router.post("/breakdown-task")
@limiter.limit("10/minute")
@cache(expire=3600)
async def breakdown_task(
    request: Request,
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id),
):
    """Phân tích một công việc lớn thành các công việc nhỏ (sub-tasks)."""
    if not text.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Văn bản quá dài (tối đa 5000 ký tự)")

    prompt = render_prompt("breakdown_task", text=text)
    sys_prompt = get_prompt_section("breakdown_task").get("system_prompt")

    try:
        text_res = await generate_text_with_fallback(prompt, sys_prompt)
        return {"subtasks": text_res}
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=500, detail="Lỗi xử lý AI")


class ChatMessage(BaseModel):
    role: str
    content: str
    attachments: Optional[List[Dict]] = None


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model_provider: str = "gemini"  # "gemini" | "groq" | "groq-deepseek"


@router.post("/chat")
@limiter.limit("10/minute")
async def chat_with_ai(
    request: Request,
    req: ChatRequest,
    user_id: str = Depends(get_user_id),
):
    """Tương tác chat với Student OS AI, nhận vào lịch sử tin nhắn."""
    if req.model_provider == "gemini" and not model and not groq_client:
        raise HTTPException(status_code=500, detail="AI API Key is not configured")
    if req.model_provider.startswith("groq") and not groq_client:
        raise HTTPException(status_code=500, detail="Groq API Key is not configured")

    if not req.messages:
        raise HTTPException(status_code=400, detail="Danh sách tin nhắn trống")

    has_image = any(
        att.get("type") == "image" and att.get("data")
        for m in req.messages
        for att in (m.attachments or [])
    )

    if groq_client and not has_image:
        groq_model_id = PROMPTS_CONFIG["metadata"]["models"]["fast_stream"]
        if req.model_provider == "groq-deepseek":
            groq_model_id = PROMPTS_CONFIG["metadata"]["models"]["deep_reasoning"]

        groq_messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
        for m in req.messages:
            groq_messages.append({"role": m.role, "content": m.content})

        def generate_groq_responses():
            try:
                stream = groq_client.chat.completions.create(
                    model=groq_model_id,
                    messages=groq_messages,
                    stream=True,
                )
                for chunk in stream:
                    if chunk.choices[0].delta.content:
                        yield chunk.choices[0].delta.content
            except Exception as e:
                print(f"Groq chat stream error: {e}")
                yield f" (Lỗi phản hồi từ AI: {e})"

        return StreamingResponse(generate_groq_responses(), media_type="text/plain")

    gemini_messages = []
    vision_default_prompt = get_prompt_section("chat_assistant").get(
        "vision_default_user_prompt",
        "Hãy phân tích chi tiết hình ảnh này giúp tôi.",
    )

    for m in req.messages:
        gemini_role = "model" if m.role == "assistant" else "user"
        parts = [m.content or vision_default_prompt]

        if m.attachments:
            for att in m.attachments:
                if att.get("type") == "image" and att.get("data"):
                    base64_data = att["data"]
                    if "," in base64_data:
                        base64_data = base64_data.split(",")[1]
                    try:
                        decoded_data = base64.b64decode(base64_data)
                        parts.append({"mime_type": "image/jpeg", "data": decoded_data})
                    except Exception as e:
                        print(f"Failed to decode image attachment: {e}")

        gemini_messages.append({"role": gemini_role, "parts": parts})

    def generate_responses():
        try:
            response_stream = model.generate_content(gemini_messages, stream=True)
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Gemini chat stream error: {e}")
            if groq_client:
                try:
                    groq_messages = [{"role": "system", "content": CHAT_SYSTEM_PROMPT}]
                    for m in req.messages:
                        groq_messages.append(
                            {"role": m.role, "content": m.content or vision_default_prompt}
                        )
                    stream = groq_client.chat.completions.create(
                        model=PROMPTS_CONFIG["metadata"]["models"]["fast_stream"],
                        messages=groq_messages,
                        stream=True,
                    )
                    for chunk in stream:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                    return
                except Exception as groq_err:
                    print(f"Groq stream fallback error: {groq_err}")
            yield " (Lỗi phản hồi từ AI)"

    return StreamingResponse(generate_responses(), media_type="text/plain")


class GenerateFlashcardsRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"


@router.post("/generate-flashcards")
@limiter.limit("10/minute")
async def generate_flashcards(
    request: Request,
    req: GenerateFlashcardsRequest,
    user_id: str = Depends(get_user_id),
):
    """Sử dụng khả năng Vision của Gemini để đọc ảnh tài liệu và sinh bộ flashcard (JSON)."""
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not req.image_base64:
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu ảnh")

    if len(req.image_base64) > 7 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Kích thước ảnh quá lớn (tối đa ~5MB)")

    base64_data = req.image_base64
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]

    prompt = render_prompt("generate_flashcards_image")

    try:
        decoded_data = base64.b64decode(base64_data)
    except Exception:
        raise HTTPException(
            status_code=400, detail="Dữ liệu ảnh/tài liệu không hợp lệ (không phải base64)"
        )

    try:
        response = model.generate_content(
            [prompt, {"mime_type": req.mime_type, "data": decoded_data}],
            generation_config=genai.GenerationConfig(
                response_mime_type="application/json",
                response_schema=FlashcardListSchema,
            ),
        )
        return json.loads(response.text)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Gemini OCR error: {error_msg}")
        if "429" in error_msg or "Quota" in error_msg or "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="AI đang quá tải hoặc hết lượt sử dụng miễn phí. Vui lòng đợi một lát rồi thử lại.",
            )
        raise HTTPException(
            status_code=500, detail=f"Lỗi khi phân tích ảnh bằng Gemini AI: {error_msg}"
        )


class GenerateFlashcardsFromDocumentRequest(BaseModel):
    file_names: List[str]


@router.post("/generate-flashcards-from-document")
@limiter.limit("10/minute")
async def generate_flashcards_from_document(
    request: Request,
    req: GenerateFlashcardsFromDocumentRequest,
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase),
):
    """Tạo flashcards từ tài liệu đã upload (qua document_chunks)."""
    if not req.file_names:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất một tài liệu")

    res = (
        sb.table("document_chunks")
        .select("content")
        .eq("user_id", user_id)
        .in_("file_name", req.file_names)
        .execute()
    )

    chunks = res.data or []
    if not chunks:
        raise HTTPException(
            status_code=404,
            detail="Không tìm thấy nội dung của tài liệu. Có thể tài liệu chưa được xử lý văn bản.",
        )

    full_text = "\n\n".join([chunk["content"] for chunk in chunks])
    prompt = render_prompt("generate_flashcards_document", full_text=full_text)
    sys_prompt = get_prompt_section("generate_flashcards_document").get("system_prompt")

    try:
        data = await generate_json_with_fallback(prompt, FlashcardListSchema, sys_prompt)
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý AI: {str(e)}")


class WeeklyReportRequest(BaseModel):
    week_start: str
    week_end: str


@router.post("/generate-weekly-report")
@limiter.limit("10/minute")
async def generate_weekly_report(
    request: Request,
    req: WeeklyReportRequest,
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase),
):
    res_tasks = (
        sb.table("tasks")
        .select("title, completed, due_date")
        .eq("user_id", user_id)
        .gte("due_date", req.week_start)
        .lte("due_date", req.week_end)
        .execute()
    )
    tasks = res_tasks.data or []

    res_sessions = (
        sb.table("study_sessions")
        .select("duration_minutes, subjects(title)")
        .eq("user_id", user_id)
        .gte("started_at", req.week_start)
        .lte("ended_at", req.week_end)
        .execute()
    )
    sessions = res_sessions.data or []

    total_study_minutes = sum(s.get("duration_minutes", 0) for s in sessions)
    completed_tasks = [t for t in tasks if t.get("completed")]
    pending_tasks = [t for t in tasks if not t.get("completed")]

    prompt = render_prompt(
        "weekly_advisor_report",
        total_study_minutes=total_study_minutes,
        completed_tasks_count=len(completed_tasks),
        pending_tasks_count=len(pending_tasks),
        user_prompt="Phân tích kết quả học tập tuần qua và đề xuất hướng cải thiện cho tuần tới.",
    )
    sys_prompt = get_prompt_section("weekly_advisor_report").get("system_prompt")

    try:
        report_html = await generate_text_with_fallback(prompt, sys_prompt)
        report_html = report_html.strip()
        if report_html.startswith("```html"):
            report_html = report_html[7:]
        if report_html.startswith("```"):
            report_html = report_html[3:]
        if report_html.endswith("```"):
            report_html = report_html[:-3]
        report_html = report_html.strip()

        sb.table("ai_reports").insert(
            {
                "user_id": user_id,
                "week_start": req.week_start,
                "week_end": req.week_end,
                "content": report_html,
            }
        ).execute()

        return {"content": report_html}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo báo cáo: {str(e)}")


@router.get("/weekly-reports")
@limiter.limit("10/minute")
async def get_weekly_reports(
    request: Request,
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase),
):
    res = (
        sb.table("ai_reports")
        .select("*")
        .eq("user_id", user_id)
        .order("created_at", desc=True)
        .execute()
    )
    return res.data


class GenerateMockTestRequest(BaseModel):
    topic: str
    num_multiple_choice: int = 5
    num_essay: int = 1


@router.post("/generate-mock-test")
@limiter.limit("10/minute")
async def generate_mock_test(
    request: Request,
    req: GenerateMockTestRequest,
    user_id: str = Depends(get_user_id),
):
    prompt = render_prompt(
        "generate_mock_test",
        topic=req.topic,
        num_multiple_choice=req.num_multiple_choice,
        num_essay=req.num_essay,
    )
    sys_prompt = get_prompt_section("generate_mock_test").get("system_prompt")

    try:
        data = await generate_json_with_fallback(prompt, MockTestSchema, sys_prompt)
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo đề thi: {str(e)}")


class GradeEssayRequest(BaseModel):
    question: str
    student_answer: str


@router.post("/grade-essay")
@limiter.limit("10/minute")
async def grade_essay(
    request: Request,
    req: GradeEssayRequest,
    user_id: str = Depends(get_user_id),
):
    prompt = render_prompt(
        "grade_essay",
        question=req.question,
        student_answer=req.student_answer,
    )
    sys_prompt = get_prompt_section("grade_essay").get("system_prompt")

    try:
        data = await generate_json_with_fallback(prompt, GradeEssaySchema, sys_prompt)
        return data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi chấm thi: {str(e)}")
