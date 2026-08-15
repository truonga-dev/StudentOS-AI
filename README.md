<div align="center">
  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/graduation-cap.svg" alt="Student OS Logo" width="120" height="120">
  
  # Student OS & AI Workspace
  
  **Hệ điều hành học tập toàn diện dành cho sinh viên, tích hợp Trợ lý AI thông minh.**

  [![Frontend](https://img.shields.io/badge/Frontend-Vercel-black?logo=vercel&style=for-the-badge)](https://student-os-ai-navy.vercel.app)
  [![Backend](https://img.shields.io/badge/Backend-Render-46E3B7?logo=render&style=for-the-badge&logoColor=white)](https://student-os-backend-z5d1.onrender.com/)
  [![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)]()
  [![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=FastAPI&logoColor=white)]()
  [![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)]()
  
  *Đồ án Môn học - Đại học Đông Á (UDA)*
</div>

---

## 🌟 Giới thiệu

**Student OS** không chỉ là một ứng dụng quản lý học tập thông thường. Đây là một "Hệ điều hành" cá nhân hóa được thiết kế riêng cho sinh viên, kết hợp sức mạnh của **Trí tuệ nhân tạo (AI)** để tối ưu hóa quá trình tiếp thu kiến thức.

Từ việc tự động hóa quản lý deadline, tính toán điểm số (GPA) theo thời gian thực, cho đến việc sử dụng AI để tóm tắt tài liệu PDF và tự động tạo thẻ ghi nhớ (Flashcards) — tất cả đều có trong một nền tảng duy nhất với giao diện UI/UX tối giản, hiện đại và chuẩn Accessibility.

## ✨ Tính năng nổi bật

### 📚 Không gian học tập (Workspace)
- **Quản lý Tài liệu:** Tải lên và quản lý giáo trình, slide bài giảng (PDF).
- **Trợ lý AI (PDF Chat):** Trực tiếp trò chuyện với tài liệu. AI sẽ đọc hiểu file PDF và trả lời mọi câu hỏi liên quan đến bài giảng.
- **Tóm tắt thông minh:** Rút trích các ý chính của một chương sách chỉ trong vài giây.

### 🧠 Thẻ ghi nhớ (Flashcards)
- **Tạo Flashcard tự động bằng AI:** Biến đoạn văn bản hoặc tài liệu dài thành bộ câu hỏi/trắc nghiệm flashcard tự động.
- **Ôn tập hiệu quả:** Luyện tập ghi nhớ kiến thức trước kỳ thi bằng giao diện lật thẻ trực quan.

### 📊 Quản lý Điểm số (GPA Tracker)
- **Tính điểm thời gian thực:** Thêm các môn học, tín chỉ và trọng số. Hệ thống tự động tính toán điểm hệ 10 và hệ 4 (theo chuẩn đại học UDA).
- **Phân tích kết quả:** Biểu đồ trực quan theo dõi tiến độ học tập qua từng học kỳ.

### 📅 Lịch & Deadline (Calendar & Tasks)
- **Quản lý thời gian:** Thêm lịch thi, lịch học bù và nhắc nhở deadline bài tập lớn.
- **Tích hợp:** Liên kết trực tiếp các task với từng môn học cụ thể.

## 🛠 Công nghệ sử dụng

Dự án được xây dựng theo kiến trúc **Client-Server (SPA)** hiện đại:

### Frontend
- **Framework:** React 18 (Bootstrapped with Vite)
- **Ngôn ngữ:** TypeScript
- **Styling:** Tailwind CSS (Class-variance-authority, clsx, Tailwind-merge)
- **State Management:** Zustand, TanStack Query (React Query)
- **Routing:** React Router v6 (Lazy loading)
- **Animation/Icons:** Framer Motion, Lucide React

### Backend
- **Framework:** FastAPI (Python)
- **Database & Auth:** Supabase (PostgreSQL, Row Level Security)
- **AI Processing:** Tích hợp các LLM APIs, LangChain (Xử lý và nhúng dữ liệu PDF, RAG pipelines).
- **Storage:** Supabase Storage (Lưu trữ PDF).

### DevOps & Tối ưu hoá
- **CI/CD:** Tự động deploy thông qua GitHub Actions, Vercel (Frontend), và Render (Backend).
- **Performance:** Tối ưu hóa Code Splitting, Lazy Loading (Lighthouse Score xanh).
- **SEO & A11y:** Hỗ trợ chuẩn WCAG 2.1 (Aria-labels, Landmarks) và SEO cơ bản (Robots.txt, LLMs.txt).

## 🚀 Hướng dẫn cài đặt (Local Development)

### Yêu cầu hệ thống
- [Node.js](https://nodejs.org/) (v18 trở lên)
- [Python](https://www.python.org/) (v3.10 trở lên)
- Một tài khoản [Supabase](https://supabase.com/)

### 1. Cài đặt Backend
```bash
cd backend
# Tạo môi trường ảo
python -m venv venv
source venv/Scripts/activate # (Trên Windows)

# Cài đặt thư viện
pip install -r requirements.txt

# Cấu hình biến môi trường (Tạo file .env)
# SUPABASE_URL=...
# SUPABASE_KEY=...
# OPENAI_API_KEY=...

# Chạy server (Cổng 8000)
uvicorn app.main:app --reload
```

### 2. Cài đặt Frontend
```bash
cd client
# Cài đặt dependencies
npm install

# Cấu hình biến môi trường (Tạo file .env)
# VITE_SUPABASE_URL=...
# VITE_SUPABASE_ANON_KEY=...
# VITE_API_URL=http://localhost:8000

# Chạy ứng dụng (Cổng 3000)
npm run dev
```

## 📸 Ảnh chụp màn hình (Screenshots)

*(Bạn có thể thay thế các link ảnh dưới đây bằng link ảnh thực tế của dự án)*

<div align="center">
  <img src="https://via.placeholder.com/800x450/0f172a/ffffff?text=Dashboard+Overview" alt="Dashboard" width="80%">
  <br/>
  <i>Giao diện Dashboard tổng quan (Dark Mode)</i>
</div>

<br/>

<div align="center">
  <img src="https://via.placeholder.com/800x450/0f172a/ffffff?text=AI+PDF+Workspace" alt="PDF Workspace" width="80%">
  <br/>
  <i>Không gian học tập và trò chuyện với PDF bằng AI</i>
</div>

---
<div align="center">
  Made with ❤️ by <b>Truong A</b> &middot; Đại học Đông Á
</div>