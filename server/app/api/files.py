from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from typing import List
from pydantic import BaseModel
import google.generativeai as genai
from fastapi.responses import StreamingResponse

from app.core.auth import get_user_id
from app.core.supabase_client import get_user_supabase
from supabase import Client
from app.core.config import settings
from app.core.prompts import PROMPTS_CONFIG, get_prompt_section

router = APIRouter(prefix="/files", tags=["files"])

if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)
    chat_model = genai.GenerativeModel(PROMPTS_CONFIG["metadata"]["models"]["multimodal_vision"])
else:
    chat_model = None

try:
    from groq import Groq
except ImportError:
    Groq = None

if settings.groq_api_key and Groq:
    groq_client = Groq(api_key=settings.groq_api_key)
else:
    groq_client = None


def chunk_text(text: str, chunk_size: int = 1000, overlap: int = 200) -> List[str]:
    chunks = []
    start = 0
    while start < len(text):
        end = start + chunk_size
        chunks.append(text[start:end])
        start += chunk_size - overlap
    return chunks


@router.post("/upload")
async def upload_and_process_pdf(
    file: UploadFile = File(...),
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase),
):
    """Nhận file PDF, trích xuất văn bản, chia nhỏ và tạo embeddings để lưu vào database (RAG)."""
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng PDF")

    if not settings.gemini_api_key:
        raise HTTPException(status_code=500, detail="Chưa cấu hình Gemini API Key")

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="Thư viện PyMuPDF (fitz) chưa được cài đặt")

    try:
        content = await file.read()
        pdf_doc = fitz.open(stream=content, filetype="pdf")

        full_text = ""
        for page in pdf_doc:
            full_text += page.get_text()

        if not full_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Không thể trích xuất văn bản từ PDF này (có thể là ảnh scan chưa qua OCR)",
            )

        chunks = chunk_text(full_text)
        embedding_model = PROMPTS_CONFIG["metadata"]["models"]["embedding"]

        for chunk in chunks:
            embedding_response = genai.embed_content(
                model=embedding_model,
                content=chunk,
                task_type="retrieval_document",
                output_dimensionality=768,
            )
            embedding = embedding_response["embedding"]

            data = {
                "user_id": user_id,
                "file_name": file.filename,
                "content": chunk,
                "embedding": embedding,
            }
            sb.table("document_chunks").insert(data).execute()

        return {"message": "Xử lý và lưu trữ tài liệu thành công", "chunks_count": len(chunks)}

    except Exception as e:
        print(f"Lỗi xử lý PDF: {e}")
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý file: {str(e)}")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    file_names: List[str] | None = None


@router.post("/chat")
async def chat_with_documents(
    req: ChatRequest,
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase),
):
    """Chat với AI dựa trên ngữ cảnh của tất cả tài liệu PDF đã upload (RAG)."""
    if not chat_model and not groq_client:
        raise HTTPException(status_code=500, detail="AI API Key is not configured")

    if not req.messages:
        raise HTTPException(status_code=400, detail="Danh sách tin nhắn trống")

    user_query = req.messages[-1].content

    try:
        embedding_model = PROMPTS_CONFIG["metadata"]["models"]["embedding"]
        query_embedding_res = genai.embed_content(
            model=embedding_model,
            content=user_query,
            task_type="retrieval_query",
            output_dimensionality=768,
        )
        query_embedding = query_embedding_res["embedding"]

        rpc_res = sb.rpc(
            "match_document_chunks",
            {
                "query_embedding": query_embedding,
                "match_threshold": 0.5,
                "match_count": 5,
                "p_user_id": user_id,
                "p_file_names": req.file_names,
            },
        ).execute()

        context_chunks = rpc_res.data or []
        context_text = ""
        for chunk in context_chunks:
            context_text += f"\n--- Trích đoạn từ tài liệu '{chunk['file_name']}':\n{chunk['content']}\n"

        rag_section = get_prompt_section("rag_document_chat")
        system_instruction = rag_section["system_template"].replace("{context_text}", context_text)
        final_user_prompt = (
            rag_section["user_template"]
            .replace("{system_instruction}", system_instruction)
            .replace("{user_query}", user_query)
        )

        if groq_client:
            def generate_groq_rag():
                try:
                    groq_messages = []
                    for m in req.messages[:-1]:
                        role = "assistant" if m.role == "assistant" else "user"
                        groq_messages.append({"role": role, "content": m.content})
                    groq_messages.append({"role": "user", "content": final_user_prompt})

                    groq_stream = groq_client.chat.completions.create(
                        model=PROMPTS_CONFIG["metadata"]["models"]["fast_stream"],
                        messages=groq_messages,
                        temperature=0.4,
                        stream=True,
                    )
                    for chunk in groq_stream:
                        if chunk.choices[0].delta.content:
                            yield chunk.choices[0].delta.content
                except Exception as e:
                    print(f"Groq RAG stream error: {e}")
                    yield f"\n\n(Lỗi phản hồi từ AI: {e})"

            return StreamingResponse(generate_groq_rag(), media_type="text/plain")

        gemini_messages = []
        for m in req.messages[:-1]:
            gemini_role = "model" if m.role == "assistant" else "user"
            gemini_messages.append({"role": gemini_role, "parts": [m.content]})

        gemini_messages.append({"role": "user", "parts": [final_user_prompt]})

        def generate_responses():
            try:
                response_stream = chat_model.generate_content(gemini_messages, stream=True)
                for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
            except Exception as e:
                yield f"\n\n(Lỗi phản hồi từ AI: {e})"

        return StreamingResponse(generate_responses(), media_type="text/plain")

    except Exception as e:
        error_msg = str(e)
        print(f"RAG chat error: {error_msg}")
        if "429" in error_msg or "Quota" in error_msg or "rate limit" in error_msg.lower():
            raise HTTPException(
                status_code=429,
                detail="Hệ thống phân tích tài liệu đang quá tải (Gemini Quota). Vui lòng thử lại sau vài phút.",
            )
        raise HTTPException(status_code=500, detail="Lỗi xử lý câu hỏi với tài liệu")
