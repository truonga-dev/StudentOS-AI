<div align="center">
  <img src="client/public/favicon.svg" alt="Logo" width="100" height="100" />
  <h1>🎓 Student OS AI</h1>
  <p><strong>Nền tảng Quản lý Học tập Toàn diện tích hợp Trí tuệ Nhân tạo</strong></p>

  <!-- Badges -->
  <p>
    <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
    <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
    <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
    <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
  </p>
  <p>
    <img src="https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white" alt="Vercel" />
    <img src="https://img.shields.io/badge/Render-46E3B7?style=for-the-badge&logo=render&logoColor=white" alt="Render" />
  </p>
</div>

<br />

> **Student OS AI** là một hệ sinh thái học tập thông minh (Learning Management Ecosystem) được xây dựng dành riêng cho sinh viên, học sinh và những người tự học. Nền tảng kết hợp các phương pháp quản lý thời gian khoa học và sức mạnh của Trí tuệ Nhân tạo (Gemini / Groq LLM) để tối ưu hóa hiệu suất học tập.

---

## 🌟 Tính năng nổi bật

### 1. 🤖 Trợ lý AI Thông minh (AI Notes & Reports)
- **Tạo Bản đồ tư duy (Mindmap)** tự động từ tài liệu học tập.
- Tự động tóm tắt bài giảng dài thành các ý chính cô đọng.
- **AI Weekly Report**: Phân tích tiến độ học tập hàng tuần và đưa ra lời khuyên cá nhân hóa.
- Tự động sinh Flashcards và câu hỏi trắc nghiệm (Quiz) từ ghi chú.

### 2. ⏳ Không gian tập trung (Focus Space)
- Tích hợp đồng hồ **Pomodoro Timer** chuẩn khoa học (25p làm / 5p nghỉ).
- Theo dõi lịch sử các phiên học và ghi nhận thời gian tự động.

### 3. 📊 Dashboard Tổng quan Gamification
- **Hero Profile**: Hiển thị điểm kinh nghiệm (XP), chuỗi ngày học (Streak) và cấp độ (Level) nhằm tạo động lực.
- **Study Hours Chart**: Biểu đồ phân tích thời gian học tập chi tiết theo từng ngày trong tuần.
- **GPA Tracker**: Hệ thống tính toán và theo dõi điểm trung bình (GPA) tự động qua từng học kỳ.

### 4. 📅 Lịch học & Quản lý Deadline
- Lịch trực quan quản lý sự kiện, bài tập lớn và lịch thi.
- Hỗ trợ tạo sự kiện lặp lại (hằng ngày / hằng tuần).
- Quản lý công việc (Tasks) theo bảng trạng thái và mức độ ưu tiên.

### 5. 👥 Cộng đồng học tập (Real-time Community)
- Các không gian trò chuyện riêng biệt theo từng môn học (Channels).
- Nhắn tin, chia sẻ file, tương tác thời gian thực nhờ công nghệ Supabase Realtime.

### 6. 📚 Quản lý Môn học & Tài liệu
- Lưu trữ tài liệu (PDF, Word, Ảnh) phân loại khoa học theo từng môn học (Supabase Storage).
- Theo dõi tiến độ hoàn thành các công việc (Task Progress) của từng môn.

---

## 🏗️ Kiến trúc hệ thống & Công nghệ

Dự án áp dụng kiến trúc **Client-Server** phân tách rõ ràng, tối ưu hóa hiệu suất và khả năng mở rộng:

### Frontend (Client)
- **Framework**: React 18, TypeScript, Vite.
- **Styling**: Tailwind CSS v4, Lucide Icons, Framer Motion (Animation).
- **State Management**: Zustand, React Context API.
- **Routing**: React Router v6.

### Backend (Server)
- **Framework**: Python 3.11+, FastAPI.
- **Caching & Rate Limiting**: Redis, `fastapi-cache2`, `slowapi` (Bảo vệ API khỏi DDoS).
- **AI Processing**: Tích hợp Google Gemini API và Groq API.

### Database & DevOps
- **Database**: Supabase (PostgreSQL), tích hợp PGVector cho AI Search.
- **Authentication**: Supabase Auth (Email/Password, Google OAuth).
- **CI/CD**: Tự động hóa kiểm thử và triển khai bằng GitHub Actions.
- **Hosting**: Vercel (Frontend) & Render (Backend).

---

## 🚀 Hướng dẫn cài đặt (Local Development)

### Yêu cầu hệ thống
- [Node.js](https://nodejs.org/en/) v18+ & npm
- [Python](https://www.python.org/) 3.11+ & pip
- Tài khoản [Supabase](https://supabase.com/)
- [Redis Server](https://redis.io/) (hoặc dùng Redis Cloud)

### ① Cài đặt Frontend

```bash
git clone https://github.com/your-username/student-os-ai.git
cd student-os-ai/client

# Cài đặt thư viện
npm install
```

Tạo file `client/.env`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_STORAGE_BUCKET=student-files
VITE_API_URL=http://localhost:8000/api/v1
```

Khởi chạy Frontend:
```bash
npm run dev
# Truy cập tại: http://localhost:5173
```

### ② Cài đặt Backend

```bash
cd ../server

# Khởi tạo môi trường ảo Python
python -m venv venv
venv\Scripts\activate      # Trên Windows
source venv/bin/activate   # Trên macOS/Linux

# Cài đặt thư viện
pip install -r requirements.txt
```

Tạo file `server/.env`:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_service_key
SUPABASE_JWT_SECRET=your_jwt_secret
GEMINI_API_KEY=your_gemini_key
GROQ_API_KEY=your_groq_key
REDIS_URL=redis://localhost:6379
ALLOWED_ORIGINS=http://localhost:5173,https://your-vercel-domain.app
```

Khởi chạy Backend:
```bash
uvicorn app.main:app --reload
# API chạy tại: http://localhost:8000
# Tài liệu API (Swagger UI): http://localhost:8000/docs
```

---

## 🚢 Triển khai (Deployment)

Dự án đã được cấu hình **CI/CD tự động** thông qua GitHub Actions (`.github/workflows/ci.yml` và `deploy-backend.yml`).

1. **Frontend**: Triển khai tự động trên **Vercel** khi có code push lên nhánh `main`. Yêu cầu cấu hình `vercel.json` để hỗ trợ React Router SPA.
2. **Backend**: Triển khai tự động trên **Render** (thông qua Webhook) sau khi vượt qua các bước kiểm thử (Linting/Testing) của GitHub Actions.

---

## 🤝 Hướng dẫn đóng góp

Chúng tôi hoan nghênh mọi sự đóng góp! Quy trình chuẩn:
1. **Fork** dự án.
2. Tạo branch mới: `git checkout -b feat/tinh-nang-moi`.
3. Commit thay đổi theo chuẩn **Conventional Commits** (VD: `feat: thêm chức năng X`, `fix: sửa lỗi Y`).
4. Push lên nhánh: `git push origin feat/tinh-nang-moi`.
5. Tạo Pull Request (PR) để review.

---

<div align="center">
  <p>Được thiết kế và phát triển với 💖 dành cho cộng đồng học sinh, sinh viên Việt Nam.</p>
</div>