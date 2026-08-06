from fastapi import APIRouter, Depends, HTTPException, Body
from fastapi.responses import StreamingResponse
from typing import Optional, List, Dict
from pydantic import BaseModel
from app.core.config import settings
from app.core.auth import get_user_id
from app.core.supabase_client import get_supabase, get_user_supabase
from supabase import Client
import google.generativeai as genai
try:
    from groq import Groq
except ImportError:
    Groq = None

router = APIRouter(prefix="/ai", tags=["ai"])

# ── Gemini Setup ──────────────────────────────────────────────────────────────
# Configure API key from settings
if settings.gemini_api_key:
    genai.configure(api_key=settings.gemini_api_key)
    # Instantiate the model with a system instruction to act as a study assistant
    # Print available models for debugging
    print("Available Gemini models:")
    for m in genai.list_models():
        if "generateContent" in m.supported_generation_methods:
            print(m.name)
            
    model = genai.GenerativeModel(
        "gemini-2.0-flash",
        system_instruction="Bạn là một Trợ lý học tập xuất sắc tên là Student OS AI. Hãy trả lời ngắn gọn, thân thiện, khoa học, giúp sinh viên giải đáp bài tập, lên kế hoạch học tập hoặc giải thích các khái niệm. Luôn dùng tiếng Việt chuẩn, format markdown đẹp mắt."
    )
else:
    model = None

# ── Groq Setup ───────────────────────────────────────────────────────────────
if settings.groq_api_key and Groq:
    groq_client = Groq(api_key=settings.groq_api_key)
else:
    groq_client = None

async def generate_text_with_fallback(prompt: str) -> str:
    """Gọi Gemini, nếu lỗi 429 thì fallback sang Groq."""
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")
        
    try:
        response = model.generate_content(prompt)
        # Nếu bị chặn safety, response.text sẽ raise ValueError
        return response.text
    except Exception as e:
        error_msg = str(e)
        print(f"Gemini error: {error_msg}")
        
        # Nếu có cấu hình Groq, ta sẽ fallback trên TẤT CẢ các lỗi từ Gemini (bao gồm 429, 500, 503, safety block, v.v.)
        if groq_client:
            print("Falling back to Groq...")
            try:
                groq_resp = groq_client.chat.completions.create(
                    model="llama-3.1-8b-instant",
                    messages=[{"role": "user", "content": prompt}],
                    temperature=0.5
                )
                content = groq_resp.choices[0].message.content
                if content:
                    return content
                else:
                    raise Exception("Groq returned empty content")
            except Exception as groq_err:
                print(f"Groq fallback error: {groq_err}")
                raise HTTPException(status_code=500, detail=f"AI Gemini lỗi ({error_msg}) và Groq cũng lỗi ({str(groq_err)}).")
        else:
            if "429" in error_msg or "quota" in error_msg.lower() or "rate limit" in error_msg.lower():
                raise HTTPException(status_code=429, detail="AI đang quá tải (Gemini). Groq dự phòng chưa được cấu hình. Vui lòng thử lại sau.")
            raise HTTPException(status_code=500, detail=f"Lỗi kết nối AI (Gemini): {error_msg}")

import re

def extract_json_from_text(text: str) -> str:
    """Trích xuất chuỗi JSON từ phản hồi của AI."""
    text = text.strip()
    
    # Tìm ```json ... ```
    match = re.search(r'```(?:json)?\s*(.*?)\s*```', text, re.DOTALL)
    if match:
        return match.group(1).strip()
        
    # Thử tìm object/array ngoài cùng
    start_idx = -1
    end_idx = -1
    
    first_bracket = text.find('[')
    last_bracket = text.rfind(']')
    first_brace = text.find('{')
    last_brace = text.rfind('}')
    
    if first_bracket != -1 and first_brace != -1:
        if first_bracket < first_brace:
            start_idx = first_bracket
            end_idx = max(last_bracket, last_brace) # roughly
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
        return text[start_idx:end_idx+1]
        
    return text

@router.post("/summarize")
async def summarize_text(
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id)
):
    """
    Tóm tắt nội dung ghi chú sử dụng Gemini AI.
    """
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")

    prompt = f"""
    Bạn là một trợ lý học tập AI xuất sắc. 
    Hãy đọc và tóm tắt ghi chú học tập dưới đây một cách cực kỳ ngắn gọn, súc tích, 
    nhấn mạnh vào các ý chính, khái niệm quan trọng và kiến thức cốt lõi.
    Trình bày bằng các gạch đầu dòng (markdown) rõ ràng. Dùng tiếng Việt chuẩn.
    
    Ghi chú:
    \"\"\"{text}\"\"\"
    """

    try:
        text_res = await generate_text_with_fallback(prompt)
        return {"summary": text_res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi xử lý AI")


@router.post("/suggest-tasks")
async def suggest_tasks(
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id)
):
    """
    Phân tích ghi chú và gợi ý các task (bài tập, ôn tập) cần làm.
    """
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")

    prompt = f"""
    Dựa vào ghi chú bài học dưới đây, hãy đề xuất 3-5 hành động/bài tập (to-do list) cụ thể 
    mà sinh viên nên làm tiếp theo để nắm vững kiến thức.
    Trình bày dưới dạng danh sách gạch đầu dòng ngắn gọn.
    
    Ghi chú:
    \"\"\"{text}\"\"\"
    """

    try:
        text_res = await generate_text_with_fallback(prompt)
        return {"tasks": text_res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi xử lý AI")


@router.post("/generate-mindmap")
async def generate_mindmap_endpoint(
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id)
):
    """
    Phân tích ghi chú và tạo sơ đồ tư duy dạng Mermaid (graph TD hoặc mindmap).
    """
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")

    prompt = f"""
    Dựa vào ghi chú bài học dưới đây, hãy tạo ra một biểu đồ sơ đồ tư duy (mindmap) bằng cú pháp MermaidJS.
    
    YÊU CẦU BẮT BUỘC:
    1. Bắt đầu câu trả lời NGAY LẬP TỨC bằng chữ `graph TD`.
    2. TUYỆT ĐỐI KHÔNG thêm bất kỳ một chữ nào khác (như "Dưới đây là...", "✅ Task...", v.v). Không dùng markdown block (```mermaid). Chỉ trả về text code thuần túy.
    3. Hướng biểu đồ nên dùng `graph TD`.
    4. CỰC KỲ QUAN TRỌNG: Tên định danh của node (Node ID) TUYỆT ĐỐI KHÔNG ĐƯỢC chứa dấu cách (space) hoặc ký tự đặc biệt. Hãy dùng các chữ cái hoặc số dính liền nhau (VD: A, B1, Node2, GiaiDoan1).
    5. TUYỆT ĐỐI luôn bọc nội dung hiển thị (Label) của các node trong dấu ngoặc kép (" ") và dùng ngoặc vuông [ ]. 
       Ví dụ đúng: Node1["Giai đoạn 1: Dart Cơ bản (Cú pháp)"]
       Ví dụ sai: Giai đoạn 1["Giai đoạn 1"] (Vì Node ID có dấu cách)
       Ví dụ sai: Node1((Giai đoạn 1)) (Không dùng ngoặc đơn tròn hoặc thả rông)

    Ví dụ mẫu bắt buộc tuân theo (lưu ý Node ID như A, B, C không có dấu cách):
    graph TD
        A["Ý chính (Cốt lõi)"] --> B["Nhánh 1: Cơ bản"]
        A --> C["Nhánh 2: Nâng cao"]
        B --> B1["Chi tiết 1"]

    Ghi chú:
    \"\"\"{text}\"\"\"
    """

    try:
        text_res = await generate_text_with_fallback(prompt)
        clean_text = text_res.strip()
        
        # Lọc bỏ mọi thứ trước chữ "graph" hoặc "mindmap"
        if "graph " in clean_text:
            clean_text = clean_text[clean_text.find("graph "):]
        elif "mindmap" in clean_text:
            clean_text = clean_text[clean_text.find("mindmap"):]
            
        if clean_text.startswith("```mermaid"):
            clean_text = clean_text[10:]
        elif clean_text.startswith("```"):
            clean_text = clean_text[3:]
        
        # Strip trailing backticks
        clean_text = clean_text.split("```")[0].strip()
            
        return {"mindmap": clean_text}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi xử lý AI")


@router.post("/generate-flashcards-from-text")
async def generate_flashcards_from_text_endpoint(
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id)
):
    """
    Sử dụng Gemini để đọc văn bản và sinh bộ flashcard (JSON).
    """
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu văn bản")

    prompt = f"""
    Bạn là một trợ lý giáo dục xuất sắc.
    Hãy đọc ghi chú học tập dưới đây, trích xuất các ý chính quan trọng, các định nghĩa hoặc công thức.
    Sau đó, hãy tạo ra một danh sách các thẻ ghi nhớ (Flashcards).
    
    YÊU CẦU BẮT BUỘC: 
    Trường trả về phải ĐÚNG ĐỊNH DẠNG JSON MẢNG (Array of JSON) chứa các object gồm 2 key: "question" và "answer".
    Chỉ trả về JSON, tuyệt đối KHÔNG có markdown ```json ở đầu hay cuối đoạn.
    
    Ví dụ:
    [
      {{ "question": "Khái niệm A là gì?", "answer": "Là một khái niệm..." }},
      {{ "question": "Công thức tính B?", "answer": "B = x + y" }}
    ]

    Ghi chú:
    \"\"\"{text}\"\"\"
    """

    try:
        text_res = await generate_text_with_fallback(prompt)
        
        import json
        clean_text = extract_json_from_text(text_res)
        try:
            flashcards_data = json.loads(clean_text)
            return {"flashcards": flashcards_data}
        except json.JSONDecodeError:
            print("Failed to parse JSON from AI:", clean_text)
            raise HTTPException(status_code=500, detail="AI trả về sai định dạng JSON. Vui lòng thử lại.")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi khi phân tích: {str(e)}")

@router.post("/generate-quiz")
async def generate_quiz_endpoint(
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id)
):
    """
    Sử dụng Gemini để đọc văn bản và sinh bài thi trắc nghiệm (JSON).
    """
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu văn bản")

    prompt = f"""
    Bạn là một giáo viên xuất sắc.
    Hãy đọc nội dung dưới đây và tạo ra một bài thi trắc nghiệm gồm 5 câu hỏi để kiểm tra kiến thức.
    
    YÊU CẦU BẮT BUỘC: 
    Trường trả về phải ĐÚNG ĐỊNH DẠNG JSON MẢNG (Array of JSON) chứa các câu hỏi.
    Mỗi câu hỏi phải có các trường: "question", "options" (mảng 4 đáp án), "correct_index" (vị trí đáp án đúng từ 0-3), "explanation" (giải thích ngắn gọn).
    Chỉ trả về JSON, tuyệt đối KHÔNG có markdown ```json ở đầu hay cuối đoạn.
    
    Ví dụ:
    [
      {{ 
        "question": "Thủ đô của Việt Nam là gì?", 
        "options": ["Hà Nội", "Hồ Chí Minh", "Đà Nẵng", "Huế"],
        "correct_index": 0,
        "explanation": "Hà Nội là thủ đô của Việt Nam."
      }}
    ]

    Nội dung:
    \"\"\"{text}\"\"\"
    """

    try:
        text_res = await generate_text_with_fallback(prompt)
        
        import json
        clean_text = extract_json_from_text(text_res)
        try:
            quiz_data = json.loads(clean_text)
            return {"quiz": quiz_data}
        except json.JSONDecodeError:
            print("Failed to parse JSON from AI:", clean_text)
            raise HTTPException(status_code=500, detail="AI trả về sai định dạng JSON. Vui lòng thử lại.")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý AI: {str(e)}")

@router.post("/breakdown-task")
async def breakdown_task(
    text: str = Body(..., embed=True),
    user_id: str = Depends(get_user_id)
):
    """
    Phân tích một công việc lớn thành các công việc nhỏ (sub-tasks).
    """
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not text.strip():
        raise HTTPException(status_code=400, detail="Nội dung trống")

    prompt = f"""
    Bạn là một chuyên gia quản lý thời gian và năng suất.
    Hãy phân tích công việc dưới đây thành một danh sách các công việc nhỏ hơn (sub-tasks) để dễ dàng thực hiện.
    Trình bày dưới dạng danh sách gạch đầu dòng (markdown checklist: - [ ] ).
    Chỉ trả về danh sách, không cần giải thích dài dòng.
    
    Công việc:
    \"\"\"{text}\"\"\"
    """

    try:
        text_res = await generate_text_with_fallback(prompt)
        return {"subtasks": text_res}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Lỗi xử lý AI")


class ChatMessage(BaseModel):
    role: str
    content: str
    attachments: Optional[List[Dict]] = None

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    model_provider: str = "gemini"  # "gemini" | "groq"

@router.post("/chat")
async def chat_with_ai(
    req: ChatRequest,
    user_id: str = Depends(get_user_id)
):
    """
    Tương tác chat với Gemini AI, nhận vào lịch sử tin nhắn.
    """
    if req.model_provider == "gemini" and not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")
    if req.model_provider.startswith("groq") and not groq_client:
        raise HTTPException(status_code=500, detail="Groq API Key is not configured or groq package is missing")

    if not req.messages:
        raise HTTPException(status_code=400, detail="Danh sách tin nhắn trống")

    if req.model_provider.startswith("groq"):
        # Determine the exact groq model string
        groq_model_id = "llama-3.3-70b-versatile"
        if req.model_provider == "groq-deepseek":
            groq_model_id = "deepseek-r1-distill-llama-70b"

        # Format history cho Groq
        groq_messages = [
            {"role": "system", "content": "Bạn là một Trợ lý học tập xuất sắc tên là Student OS AI. Hãy trả lời ngắn gọn, thân thiện, khoa học. ĐẶC BIỆT LƯU Ý VỚI CÔNG THỨC TOÁN HỌC: TUYỆT ĐỐI KHÔNG dùng `\\(` hay `\\)` hay `\\[` hay `\\]`. Thay vào đó, hãy bọc tất cả công thức toán học trong dấu backtick (`) để hiển thị như code inline, hoặc viết một cách đơn giản bằng văn bản thuần."}
        ]
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
                yield " (Lỗi phản hồi từ AI Groq)"

        return StreamingResponse(generate_groq_responses(), media_type="text/plain")

    # Format history cho Gemini (model.generate_content hỗ trợ list of dict)
    # Cấu trúc của Gemini: {"role": "user" hoặc "model", "parts": ["text"]}
    gemini_messages = []
    
    for m in req.messages:
        # Chuyển đổi role 'assistant' (từ frontend) sang 'model' (cho Gemini)
        gemini_role = "model" if m.role == "assistant" else "user"
        
        parts = [m.content]
        
        # Thêm hình ảnh nếu có
        if m.attachments:
            import base64
            for att in m.attachments:
                if att.get("type") == "image" and att.get("data"):
                    base64_data = att["data"]
                    if "," in base64_data:
                        base64_data = base64_data.split(",")[1]
                    try:
                        decoded_data = base64.b64decode(base64_data)
                        parts.append({
                            "mime_type": "image/jpeg", # Default to jpeg or you can pass it from frontend
                            "data": decoded_data
                        })
                    except Exception as e:
                        print(f"Failed to decode image attachment: {e}")

        gemini_messages.append({
            "role": gemini_role,
            "parts": parts
        })

    def generate_responses():
        try:
            # Dùng generate_content dạng stream
            response_stream = model.generate_content(gemini_messages, stream=True)
            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text
        except Exception as e:
            print(f"Gemini chat stream error: {e}")
            yield " (Lỗi phản hồi từ AI)"

    return StreamingResponse(generate_responses(), media_type="text/plain")


class GenerateFlashcardsRequest(BaseModel):
    image_base64: str
    mime_type: str = "image/jpeg"

@router.post("/generate-flashcards")
async def generate_flashcards(
    req: GenerateFlashcardsRequest,
    user_id: str = Depends(get_user_id)
):
    """
    Sử dụng khả năng Vision của Gemini để đọc ảnh tài liệu và sinh bộ flashcard (JSON).
    """
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not req.image_base64:
        raise HTTPException(status_code=400, detail="Thiếu dữ liệu ảnh")

    # Loại bỏ prefix data:image/...;base64, nếu frontend có gửi lên
    base64_data = req.image_base64
    if "," in base64_data:
        base64_data = base64_data.split(",")[1]

    prompt = """
    Bạn là một trợ lý giáo dục xuất sắc.
    Hãy đọc tài liệu trong bức ảnh này, trích xuất các ý chính quan trọng, các định nghĩa hoặc công thức.
    Sau đó, hãy tạo ra một danh sách các thẻ ghi nhớ (Flashcards).
    
    YÊU CẦU BẮT BUỘC: 
    Trường trả về phải ĐÚNG ĐỊNH DẠNG JSON MẢNG (Array of JSON) chứa các object gồm 2 key: "question" và "answer".
    Chỉ trả về JSON, tuyệt đối KHÔNG có markdown ```json ở đầu hay cuối đoạn.
    
    Ví dụ:
    [
      { "question": "Khái niệm A là gì?", "answer": "Là một khái niệm..." },
      { "question": "Công thức tính B?", "answer": "B = x + y" }
    ]
    """

    import base64
    try:
        decoded_data = base64.b64decode(base64_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Dữ liệu ảnh/tài liệu không hợp lệ (không phải base64)")

    try:
        response = model.generate_content([
            prompt, 
            {
                "mime_type": req.mime_type,
                "data": decoded_data
            }
        ])
        
        clean_text = extract_json_from_text(response.text)
        import json
        
        try:
            flashcards_data = json.loads(clean_text.strip())
            return {"flashcards": flashcards_data}
        except json.JSONDecodeError:
            print("Failed to parse JSON from AI:", clean_text)
            raise HTTPException(status_code=500, detail="AI trả về sai định dạng JSON. Vui lòng thử lại.")
            
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        print(f"Gemini OCR error: {error_msg}")
        if "429" in error_msg or "Quota" in error_msg or "rate limit" in error_msg.lower():
            raise HTTPException(status_code=429, detail="AI đang quá tải hoặc hết lượt sử dụng miễn phí. Vui lòng đợi một lát rồi thử lại.")
        raise HTTPException(status_code=500, detail=f"Lỗi khi phân tích ảnh bằng Gemini AI: {error_msg}")

class GenerateFlashcardsFromDocumentRequest(BaseModel):
    file_names: List[str]

@router.post("/generate-flashcards-from-document")
async def generate_flashcards_from_document(
    req: GenerateFlashcardsFromDocumentRequest,
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase)
):
    """
    Tạo flashcards từ tài liệu đã upload (qua document_chunks).
    """
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    if not req.file_names:
        raise HTTPException(status_code=400, detail="Vui lòng chọn ít nhất một tài liệu")
    
    # Query all chunks for these files and this user
    res = sb.table("document_chunks").select("content").eq("user_id", user_id).in_("file_name", req.file_names).execute()
    
    chunks = res.data or []
    if not chunks:
        raise HTTPException(status_code=404, detail="Không tìm thấy nội dung của tài liệu. Có thể tài liệu chưa được xử lý văn bản.")

    # Concatenate contents
    full_text = "\n\n".join([chunk["content"] for chunk in chunks])
    
    prompt = f"""
    Bạn là một trợ lý giáo dục xuất sắc.
    Hãy đọc nội dung từ các tài liệu dưới đây, trích xuất các ý chính quan trọng, các định nghĩa hoặc công thức.
    Sau đó, hãy tạo ra một danh sách các thẻ ghi nhớ (Flashcards).
    
    YÊU CẦU BẮT BUỘC: 
    Trường trả về phải ĐÚNG ĐỊNH DẠNG JSON MẢNG (Array of JSON) chứa các object gồm 2 key: "question" và "answer".
    Chỉ trả về JSON, tuyệt đối KHÔNG có markdown ```json ở đầu hay cuối đoạn.
    
    Ví dụ:
    [
      {{ "question": "Khái niệm A là gì?", "answer": "Là một khái niệm..." }},
      {{ "question": "Công thức tính B?", "answer": "B = x + y" }}
    ]

    Tài liệu:
    \"\"\"{full_text}\"\"\"
    """

    try:
        text_res = await generate_text_with_fallback(prompt)
        
        clean_text = extract_json_from_text(text_res)
        import json
        try:
            flashcards_data = json.loads(clean_text.strip())
            return {"flashcards": flashcards_data}
        except json.JSONDecodeError:
            print("Failed to parse JSON from AI:", clean_text)
            raise HTTPException(status_code=500, detail="AI trả về sai định dạng JSON. Vui lòng thử lại.")
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi xử lý AI: {str(e)}")

class WeeklyReportRequest(BaseModel):
    week_start: str
    week_end: str

@router.post("/generate-weekly-report")
async def generate_weekly_report(
    req: WeeklyReportRequest,
    user_id: str = Depends(get_user_id),
    sb: Client = Depends(get_user_supabase)
):
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")
    
    # Lấy tasks tuần qua
    res_tasks = sb.table("tasks").select("title, completed, due_date").eq("user_id", user_id).gte("due_date", req.week_start).lte("due_date", req.week_end).execute()
    tasks = res_tasks.data or []
    
    # Lấy study sessions tuần qua
    res_sessions = sb.table("study_sessions").select("duration_minutes, subjects(title)").eq("user_id", user_id).gte("started_at", req.week_start).lte("ended_at", req.week_end).execute()
    sessions = res_sessions.data or []
    
    total_study_minutes = sum(s.get("duration_minutes", 0) for s in sessions)
    completed_tasks = [t for t in tasks if t.get("completed")]
    pending_tasks = [t for t in tasks if not t.get("completed")]

    prompt = f"""
    Bạn là AI Cố vấn học tập (Student OS AI). 
    Dựa trên dữ liệu học tập tuần qua của sinh viên, hãy viết một báo cáo ngắn gọn, khích lệ và đề xuất hướng cải thiện cho tuần tới.
    - Thời gian học: {total_study_minutes} phút.
    - Công việc đã hoàn thành: {len(completed_tasks)}
    - Công việc chưa hoàn thành: {len(pending_tasks)}
    
    Trả về định dạng HTML cơ bản (chỉ dùng các thẻ <b>, <i>, <p>, <ul>, <li>, <br>).
    TUYỆT ĐỐI KHÔNG DÙNG thuộc tính style hay bất kỳ class CSS/Tailwind nào (như bg-white, text-black, v.v.) để tránh lỗi hiển thị trong Dark Mode. Trả về CHỈ HTML, không chứa thẻ markdown bao bọc.
    """

    try:
        report_html = await generate_text_with_fallback(prompt)
        report_html = report_html.strip()
        if report_html.startswith("```html"):
            report_html = report_html[7:]
        if report_html.startswith("```"):
            report_html = report_html[3:]
        if report_html.endswith("```"):
            report_html = report_html[:-3]
        report_html = report_html.strip()
        
        # Lưu vào DB
        sb.table("ai_reports").insert({
            "user_id": user_id,
            "week_start": req.week_start,
            "week_end": req.week_end,
            "content": report_html
        }).execute()

        return {"content": report_html}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo báo cáo: {str(e)}")

@router.get("/weekly-reports")
async def get_weekly_reports(user_id: str = Depends(get_user_id), sb: Client = Depends(get_user_supabase)):
    res = sb.table("ai_reports").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return res.data

class GenerateMockTestRequest(BaseModel):
    topic: str
    num_multiple_choice: int = 5
    num_essay: int = 1

@router.post("/generate-mock-test")
async def generate_mock_test(
    req: GenerateMockTestRequest,
    user_id: str = Depends(get_user_id)
):
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    prompt = f"""
    Bạn là chuyên gia giáo dục. Hãy tạo một đề thi thử về chủ đề: "{req.topic}".
    Đề thi bao gồm: {req.num_multiple_choice} câu trắc nghiệm (với 4 đáp án A, B, C, D và có đánh dấu đáp án đúng) và {req.num_essay} câu tự luận.
    
    YÊU CẦU BẮT BUỘC:
    Trường trả về phải ĐÚNG ĐỊNH DẠNG JSON với cấu trúc sau, không chứa thẻ markdown (như ```json):
    {{
      "multiple_choice": [
        {{
          "question": "Câu hỏi?",
          "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
          "correct_answer": 0 
        }}
      ],
      "essay": [
        "Câu hỏi tự luận 1?",
        "Câu hỏi tự luận 2?"
      ]
    }}
    Lưu ý `correct_answer` là index của mảng options (0-3).
    """

    try:
        text_res = await generate_text_with_fallback(prompt)
        clean_text = extract_json_from_text(text_res)
        import json
        try:
            test_data = json.loads(clean_text.strip())
            return test_data
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI trả về sai định dạng JSON. Vui lòng thử lại.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi tạo đề thi: {str(e)}")

class GradeEssayRequest(BaseModel):
    question: str
    student_answer: str

@router.post("/grade-essay")
async def grade_essay(
    req: GradeEssayRequest,
    user_id: str = Depends(get_user_id)
):
    if not model:
        raise HTTPException(status_code=500, detail="Gemini API Key is not configured")

    prompt = f"""
    Bạn là một giám khảo chấm thi.
    Câu hỏi: {req.question}
    Câu trả lời của học sinh: {req.student_answer}
    
    Hãy chấm điểm (thang điểm 10) và đưa ra nhận xét chi tiết, chỉ ra điểm đúng, điểm sai và cách cải thiện.
    Trả về định dạng JSON, không kèm markdown bao bọc:
    {{
      "score": 8.5,
      "feedback": "Nhận xét chi tiết ở đây..."
    }}
    """
    
    try:
        text_res = await generate_text_with_fallback(prompt)
        clean_text = extract_json_from_text(text_res)
        import json
        try:
            grade_data = json.loads(clean_text.strip())
            return grade_data
        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="AI trả về sai định dạng JSON. Vui lòng thử lại.")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Lỗi chấm thi: {str(e)}")

