from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Body
from typing import List
from pydantic import BaseModel
import io
import google.generativeai as genai
from fastapi.responses import StreamingResponse

from app.core.auth import get_user_id
from app.core.supabase_client import get_supabase, get_user_supabase
from supabase import Client
from app.core.config import settings

router = APIRouter(prefix="/files", tags=["files"])

# Configure Gemini
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)
    chat_model = genai.GenerativeModel("gemini-2.0-flash")
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

# A simple text chunker
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
    sb: Client = Depends(get_user_supabase)
):
    """
    Nhận file PDF, trích xuất văn bản, chia nhỏ và tạo embeddings để lưu vào database (RAG).
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Chỉ hỗ trợ định dạng PDF")
    
    if not settings.gemini_api_key:
        raise HTTPException(status_code=500, detail="Chưa cấu hình Gemini API Key")

    try:
        import fitz  # PyMuPDF
    except ImportError:
        raise HTTPException(status_code=500, detail="Thư viện PyMuPDF (fitz) chưa được cài đặt")

    try:
        # Read file content
        content = await file.read()
        pdf_doc = fitz.open(stream=content, filetype="pdf")
        
        full_text = ""
        for page in pdf_doc:
            full_text += page.get_text()
            
        if not full_text.strip():
            raise HTTPException(status_code=400, detail="Không thể trích xuất văn bản từ PDF này (có thể là ảnh scan chưa qua OCR)")

        # Chunking
        chunks = chunk_text(full_text)
        
        for chunk in chunks:
            # Embed content
            embedding_response = genai.embed_content(
                model="models/gemini-embedding-2",
                content=chunk,
                task_type="retrieval_document",
                output_dimensionality=768
            )
            embedding = embedding_response['embedding']
            
            # Insert into database
            data = {
                "user_id": user_id,
                "file_name": file.filename,
                "content": chunk,
                "embedding": embedding
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
    sb: Client = Depends(get_user_supabase)
):
    """
    Chat với AI dựa trên ngữ cảnh của tất cả tài liệu PDF đã upload (RAG).
    """
    if not chat_model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")
        
    if not req.messages:
        raise HTTPException(status_code=400, detail="Danh sách tin nhắn trống")

    # Lấy câu hỏi cuối cùng của người dùng
    user_query = req.messages[-1].content

    try:
        # 1. Tạo embedding cho câu hỏi
        query_embedding_res = genai.embed_content(
            model="models/gemini-embedding-2",
            content=user_query,
            task_type="retrieval_query",
            output_dimensionality=768
        )
        query_embedding = query_embedding_res['embedding']

        # 2. Tìm kiếm các chunk tương đồng trong database thông qua RPC function
        rpc_res = sb.rpc(
            "match_document_chunks",
            {
                "query_embedding": query_embedding,
                "match_threshold": 0.5, # Độ tương đồng tối thiểu
                "match_count": 5,       # Lấy top 5 chunks
                "p_user_id": user_id,
                "p_file_names": req.file_names
            }
        ).execute()
        
        context_chunks = rpc_res.data or []
        
        # Build context string
        context_text = ""
        for i, chunk in enumerate(context_chunks):
            context_text += f"\n--- Trích đoạn từ tài liệu '{chunk['file_name']}':\n{chunk['content']}\n"
            
        # 3. Chèn context vào prompt
        system_instruction = f"""Bạn là một trợ lý thông minh hỗ trợ sinh viên học tập.
Dưới đây là một số thông tin trích xuất từ các tài liệu PDF của sinh viên (Ngữ cảnh):
{context_text}

Hãy sử dụng NGỮ CẢNH trên để trả lời câu hỏi của sinh viên. 
Nếu câu trả lời không có trong ngữ cảnh, hãy dùng kiến thức chung để trả lời nhưng nhắc nhở sinh viên rằng thông tin này không có trong tài liệu của họ.
"""

        # Format history cho Gemini
        gemini_messages = []
        for m in req.messages[:-1]: # Tất cả trừ câu cuối
            gemini_role = "model" if m.role == "assistant" else "user"
            gemini_messages.append({"role": gemini_role, "parts": [m.content]})
            
        # Thêm câu hỏi cuối cùng kèm theo context như một prompt mới
        gemini_messages.append({
            "role": "user",
            "parts": [f"HƯỚNG DẪN HỆ THỐNG: {system_instruction}\n\nCÂU HỎI CỦA NGƯỜI DÙNG: {user_query}"]
        })

        def generate_responses():
            try:
                response_stream = chat_model.generate_content(gemini_messages, stream=True)
                for chunk in response_stream:
                    if chunk.text:
                        yield chunk.text
            except Exception as e:
                error_msg = str(e)
                print(f"Gemini chat stream error: {error_msg}")
                if ("429" in error_msg or "Quota" in error_msg) and groq_client:
                    print("Gemini limit reached in chat stream. Falling back to Groq...")
                    try:
                        # Build Groq messages
                        groq_messages = []
                        for m in req.messages[:-1]:
                            role = "assistant" if m.role == "assistant" else "user"
                            groq_messages.append({"role": role, "content": m.content})
                        groq_messages.append({
                            "role": "user",
                            "content": f"HƯỚNG DẪN HỆ THỐNG: {system_instruction}\n\nCÂU HỎI CỦA NGƯỜI DÙNG: {user_query}"
                        })
                        
                        groq_stream = groq_client.chat.completions.create(
                            model="llama-3.1-8b-instant",
                            messages=groq_messages,
                            temperature=0.5,
                            stream=True
                        )
                        for chunk in groq_stream:
                            if chunk.choices[0].delta.content:
                                yield chunk.choices[0].delta.content
                    except Exception as groq_err:
                        print(f"Groq fallback error in chat stream: {groq_err}")
                        yield "\n\n(Lỗi: Cả Gemini và Groq đều từ chối yêu cầu. Vui lòng thử lại sau)"
                else:
                    yield f"\n\n(Lỗi phản hồi từ AI: {error_msg})"

        return StreamingResponse(generate_responses(), media_type="text/plain")

    except Exception as e:
        error_msg = str(e)
        print(f"RAG chat error: {error_msg}")
        if "429" in error_msg or "Quota" in error_msg or "rate limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="Hệ thống phân tích tài liệu đang quá tải (Gemini Quota). Vui lòng thử lại sau vài phút.")
        raise HTTPException(status_code=500, detail="Lỗi xử lý câu hỏi với tài liệu")
