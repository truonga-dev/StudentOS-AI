import asyncio
from app.api.ai import generate_text_with_fallback, extract_json_from_text
from app.core.config import settings

async def main():
    prompt = """
    Bạn là chuyên gia giáo dục. Hãy tạo một đề thi thử về chủ đề: "Dart".
    Đề thi bao gồm: 1 câu trắc nghiệm (với 4 đáp án A, B, C, D và có đánh dấu đáp án đúng) và 1 câu tự luận.
    
    YÊU CẦU BẮT BUỘC:
    Trường trả về phải ĐÚNG ĐỊNH DẠNG JSON với cấu trúc sau, không chứa thẻ markdown (như ```json):
    {
      "multiple_choice": [
        {
          "question": "Câu hỏi?",
          "options": ["A. Đáp án 1", "B. Đáp án 2", "C. Đáp án 3", "D. Đáp án 4"],
          "correct_answer": 0 
        }
      ],
      "essay": [
        "Câu hỏi tự luận 1?",
        "Câu hỏi tự luận 2?"
      ]
    }
    Lưu ý `correct_answer` là index của mảng options (0-3).
    """
    try:
        text_res = await generate_text_with_fallback(prompt)
        with open('output.txt', 'w', encoding='utf-8') as f:
            f.write(text_res)
        
        clean_text = extract_json_from_text(text_res)
        with open('output_clean.txt', 'w', encoding='utf-8') as f:
            f.write(clean_text)
            
        import json
        try:
            test_data = json.loads(clean_text.strip())
            with open('output_parsed.txt', 'w', encoding='utf-8') as f:
                json.dump(test_data, f, ensure_ascii=False, indent=2)
            print("Success")
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
