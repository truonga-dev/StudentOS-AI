<div align="center">
  <h1>🎓 Student OS AI</h1>
  <p><strong>Nền tảng Quản lý Học tập Toàn diện tích hợp Trí tuệ Nhân tạo</strong></p>

  <!-- Badges -->
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
  <img src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
</div>

<br />

> **Student OS AI** là một hệ sinh thái học tập thông minh (Learning Management Ecosystem) được xây dựng dành riêng cho sinh viên, học sinh và những người tự học. Nền tảng kết hợp các phương pháp quản lý thời gian khoa học và trí tuệ nhân tạo (LLM) để tối ưu hóa hiệu suất học tập.

---

## 📑 Mục lục
- [🌟 Tính năng nổi bật](#-tính-năng-nổi-bật)
- [🏗️ Kiến trúc hệ thống](#️-kiến-trúc-hệ-thống)
- [💻 Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [🚀 Hướng dẫn cài đặt (Getting Started)](#-hướng-dẫn-cài-đặt-getting-started)
- [🗺️ Lộ trình phát triển (Roadmap)](#️-lộ-trình-phát-triển-roadmap)
- [🤝 Đóng góp](#-đóng-góp)

---

## 🌟 Tính năng nổi bật

### 1. 🤖 Ghi chú thông minh (AI Notes)
- Tự động phân tích tài liệu và tạo **Bản đồ tư duy (Mindmap)** trực quan.
- Tự động tóm tắt bài giảng dài thành ý chính bằng Gemini / Groq LLM.
- Tạo câu hỏi thực hành (Quiz) và Flashcards tự động dựa trên nội dung ghi chú.

### 2. ⏳ Không gian tập trung (Focus Space)
- Tích hợp đồng hồ **Pomodoro Timer** (25p làm / 5p nghỉ) với lịch sử phiên học.
- Ghi nhận thời gian học tập tự động vào hệ thống Study Sessions.

### 3. 📊 Dashboard & Quản lý tiến độ
- **HeroProfileCard**: Hiển thị thông tin hồ sơ, điểm XP, Streak và cấp độ.
- **AI Weekly Report**: Báo cáo tổng hợp tuần học bằng AI.
- **Study Hours Chart**: Biểu đồ phân tích thời gian học tập chi tiết theo tuần.
- **Subject Progress**: Theo dõi tiến độ hoàn thành task theo từng môn học.
- **GPA Tracker**: Nhập điểm số và theo dõi GPA qua từng học kỳ (xử lý bởi Python server).

### 4. 📅 Lịch học & Quản lý Deadline (Calendar & Tasks)
- Hệ thống Calendar trực quan giúp quản lý các sự kiện, bài tập lớn và thi cử.
- Hỗ trợ sự kiện định kỳ: **một lần / hằng ngày / hằng tuần**.
- Quản lý công việc (Tasks) theo độ ưu tiên (cao / trung bình / thấp) và trạng thái hoàn thành.

### 5. 👥 Cộng đồng học tập (Community)
- Các kênh chat (Channels) riêng biệt theo từng môn học hoặc chủ đề.
- Chia sẻ file, bài tập, hình ảnh và tin nhắn thoại theo thời gian thực (Real-time Supabase).
- Hệ thống phòng riêng (DM), phản ứng cảm xúc (Reactions) và ghim tin nhắn.

### 6. 📝 Luyện thi & Flashcards
- Hệ thống **Mock Tests** giúp làm bài kiểm tra trắc nghiệm mô phỏng.
- Quản lý bộ thẻ nhớ (Flashcards) theo phương pháp lặp lại ngắt quãng (Spaced Repetition - SM2).

### 7. 📚 Quản lý Môn học & File
- Thêm, chỉnh sửa, xoá môn học với màu sắc, số tín chỉ và học kỳ tương ứng.
- Upload và quản lý tài liệu (PDF, DOCX, hình ảnh...) gắn liền với từng môn học.

---

## 🏗️ Kiến trúc hệ thống

```
student-os-ai/
├── client/          # Frontend - React + TypeScript + Vite
│   └── src/
│       ├── features/        # Các module tính năng (dashboard, notes, community, ...)
│       ├── hooks/           # Custom hooks (useAuth, useTasks, useSubjects, ...)
│       ├── components/      # Shared UI components
│       └── types/           # TypeScript interfaces & types toàn dự án
│
├── server/          # Backend - Python + FastAPI
│   └── app/
│       ├── api/             # API routes (gpa, ai, ...)
│       └── core/            # Supabase client, config
│
├── database/        # SQL migrations & schema
├── docs/            # Tài liệu kỹ thuật
└── setup/           # Sprint notes & planning
```

---

## 💻 Công nghệ sử dụng

| Layer | Công nghệ |
|---|---|
| **Frontend** | React 18, TypeScript, Vite |
| **Styling** | Tailwind CSS, Lucide Icons, Framer Motion |
| **State Management** | Zustand, Context API |
| **Backend** | Python 3.11+, FastAPI |
| **Database & Auth** | Supabase (PostgreSQL, RLS, Realtime, Storage) |
| **AI / LLM** | Google Gemini API, Groq API |
| **Routing** | React Router DOM v6 |

---

## 🚀 Hướng dẫn cài đặt (Getting Started)

### Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/en/) v18+ và npm
- [Python](https://www.python.org/) 3.11+ và pip
- Tài khoản [Supabase](https://supabase.com/) (để thiết lập database)
- Google Gemini API Key hoặc Groq API Key

---

### ① Cài đặt Frontend (Client)

```bash
# 1. Clone dự án
git clone https://github.com/your-username/student-os-ai.git
cd student-os-ai/client

# 2. Cài đặt thư viện
npm install
```

Tạo file `.env.local` bên trong thư mục `client/`:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
VITE_GROQ_API_KEY=your_groq_api_key
```

```bash
# 3. Chạy ở chế độ phát triển
npm run dev
# → Truy cập tại http://localhost:5173

# 4. Build production
npm run build
```

---

### ② Cài đặt Backend (Server)

```bash
cd ../server

# 1. Tạo môi trường ảo Python
python -m venv venv

# Windows
venv\Scripts\activate
# macOS / Linux
source venv/bin/activate

# 2. Cài đặt dependencies
pip install -r requirements.txt
```

Tạo file `.env` bên trong thư mục `server/`:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
GEMINI_API_KEY=your_gemini_api_key
```

```bash
# 3. Chạy server
uvicorn app.main:app --reload
# → API chạy tại http://localhost:8000
# → Swagger UI tại http://localhost:8000/docs
```

---

## 🗺️ Lộ trình phát triển (Roadmap)

- [x] **Phase 1:** Planning & Design (Thiết kế hệ thống và UI/UX).
- [x] **Phase 2:** Supabase Setup & Authentication (Xác thực người dùng, bảo mật RLS).
- [x] **Phase 3:** Core Modules (Dashboard, Calendar, Tasks, Subjects, Files).
- [x] **Phase 4:** AI Features Integration (AI Notes, Mindmap, Flashcards, AI Weekly Report).
- [x] **Phase 5:** Real-time Community Chat & Focus Space (Pomodoro).
- [x] **Phase 6:** Python Backend (FastAPI) – GPA Tracker, AI processing server-side.
- [x] **Phase 7:** Bug Fixing, Type Checking & TypeScript strict compliance.
- [ ] **Phase 8:** Release MVP & Deploy (Vercel + Railway/Render).
- [ ] **Phase 9:** Mobile App (React Native / Expo).

---

## 🤝 Đóng góp

Chúng tôi luôn hoan nghênh sự đóng góp từ cộng đồng! Nếu bạn tìm thấy lỗi (bug) hoặc muốn đề xuất tính năng mới:

1. **Fork** dự án này.
2. Tạo một branch mới:
   ```bash
   git checkout -b feat/ten-tinh-nang
   ```
3. Commit các thay đổi (xem hướng dẫn commit bên dưới).
4. Push lên branch đó:
   ```bash
   git push origin feat/ten-tinh-nang
   ```
5. Tạo một **Pull Request** mới và mô tả rõ thay đổi.

### 📝 Quy ước Commit Message (tiếng Việt)

Dự án sử dụng chuẩn **Conventional Commits** với mô tả bằng tiếng Việt:

| Prefix | Ý nghĩa | Ví dụ |
|---|---|---|
| `feat:` | Thêm tính năng mới | `feat: thêm bộ đếm Pomodoro` |
| `fix:` | Sửa lỗi | `fix: sửa lỗi type semester trong SubjectProgressCard` |
| `refactor:` | Tái cấu trúc code | `refactor: tách SubjectCard thành component riêng` |
| `style:` | Chỉnh sửa CSS/UI | `style: cập nhật màu sắc dashboard` |
| `docs:` | Cập nhật tài liệu | `docs: cập nhật README hướng dẫn cài đặt` |
| `chore:` | Cập nhật config, deps | `chore: nâng cấp react-router lên v6.28` |
| `perf:` | Tối ưu hiệu năng | `perf: memo hoá StudyHoursChart component` |
| `test:` | Thêm/sửa test | `test: thêm test cho GPA calculator` |

---

<div align="center">
  <p>Được thiết kế và phát triển bằng 💖 dành cho cộng đồng học tập Việt Nam.</p>
</div>
