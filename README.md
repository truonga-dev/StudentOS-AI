<div align="center">
  <h1>🎓 Student OS AI</h1>
  <p><strong>Nền tảng Quản lý Học tập Toàn diện tích hợp Trí tuệ Nhân tạo</strong></p>

  <!-- Badges -->
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-B73BFE?style=for-the-badge&logo=vite&logoColor=FFD62E" alt="Vite" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Supabase-181818?style=for-the-badge&logo=supabase&logoColor=3ECF8E" alt="Supabase" />
</div>

<br />

> **Student OS AI** là một hệ sinh thái học tập thông minh (Learning Management Ecosystem) được xây dựng dành riêng cho sinh viên, học sinh và những người tự học. Nền tảng kết hợp các phương pháp quản lý thời gian khoa học và trí tuệ nhân tạo (LLM) để tối ưu hóa hiệu suất học tập.

---

## 📑 Mục lục
- [🌟 Tính năng nổi bật](#-tính-năng-nổi-bật)
- [💻 Công nghệ sử dụng](#-công-nghệ-sử-dụng)
- [🚀 Hướng dẫn cài đặt (Getting Started)](#-hướng-dẫn-cài-đặt-getting-started)
- [🗺️ Lộ trình phát triển (Roadmap)](#️-lộ-trình-phát-triển-roadmap)
- [🤝 Đóng góp](#-đóng-góp)

---

## 🌟 Tính năng nổi bật

### 1. 🤖 Ghi chú thông minh (AI Notes)
- Tự động phân tích tài liệu và tạo **Bản đồ tư duy (Mindmap)** trực quan.
- Tự động tóm tắt bài giảng dài thành ý chính.
- Tạo câu hỏi thực hành (Quiz) và Flashcards tự động dựa trên nội dung ghi chú.

### 2. ⏳ Không gian tập trung (Focus Space)
- Tích hợp đồng hồ **Pomodoro Timer** (25p làm / 5p nghỉ).
- Tích hợp trình phát nhạc Lofi thư giãn giúp tăng cường sự tập trung.
- Hiển thị danh sách công việc (To-do list) ngay trong màn hình tập trung.

### 3. 📊 Dashboard & Quản lý tiến độ
- **GPA Tracker**: Nhập điểm số và theo dõi kết quả học tập qua từng học kỳ.
- Biểu đồ phân tích thời gian học tập chi tiết.

### 4. 📅 Lịch học & Quản lý Deadline (Calendar & Tasks)
- Hệ thống Calendar trực quan giúp quản lý các sự kiện, bài tập lớn và thi cử.
- Quản lý công việc (Tasks) theo độ ưu tiên và trạng thái.

### 5. 👥 Cộng đồng học tập (Community)
- Các nhóm thảo luận, kênh chat (Channels) riêng biệt theo từng môn học hoặc chủ đề.
- Chia sẻ file, bài tập, hình ảnh theo thời gian thực (Real-time).

### 6. 📝 Luyện thi & Flashcards
- Hệ thống **Mock Tests** giúp làm bài kiểm tra trắc nghiệm mô phỏng.
- Quản lý bộ thẻ nhớ (Flashcards) theo phương pháp lặp lại ngắt quãng (Spaced Repetition).

---

## 💻 Công nghệ sử dụng

Dự án được xây dựng với kiến trúc hiện đại, đảm bảo hiệu năng cao và dễ dàng mở rộng:

- **Core & Frontend:** React (Vite), TypeScript.
- **Styling & UI:** Tailwind CSS, Lucide Icons, Framer Motion (Animation).
- **State Management:** Zustand (Client State), Context API.
- **Backend & Database:** Supabase (PostgreSQL, Authentication, Storage, Real-time Subscriptions).
- **AI Integrations:** Gemini / Groq LLMs để xử lý ngôn ngữ tự nhiên.

---

## 🚀 Hướng dẫn cài đặt (Getting Started)

### Yêu cầu hệ thống (Prerequisites)
- [Node.js](https://nodejs.org/en/) (v18.0.0 hoặc mới hơn)
- npm hoặc yarn
- Tài khoản Supabase (để thiết lập database)

### Cài đặt và chạy dự án

**1. Clone dự án về máy**
```bash
git clone https://github.com/your-username/student-os-ai.git
cd student-os-ai
```

**2. Cài đặt thư viện**
Di chuyển vào thư mục `client` và tiến hành cài đặt:
```bash
cd client
npm install
```

**3. Thiết lập biến môi trường**
Tạo file `.env.local` tại thư mục `client` và điền các thông tin sau từ Supabase và API Keys của bạn:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_GEMINI_API_KEY=your_gemini_api_key
```

**4. Chạy dự án (Development Mode)**
```bash
npm run dev
```
Dự án sẽ được khởi chạy tại `http://localhost:5173`.

**5. Build (Production)**
```bash
npm run build
```

---

## 🗺️ Lộ trình phát triển (Roadmap)

- [x] **Phase 1:** Planning & Design (Thiết kế hệ thống và UI/UX).
- [x] **Phase 2:** Supabase Setup & Authentication (Xác thực người dùng, bảo mật RLS).
- [x] **Phase 3:** Core Modules (Dashboard, Calendar, Tasks, Subjects).
- [x] **Phase 4:** AI Features Integration (AI Notes, Mindmap, Flashcards).
- [x] **Phase 5:** Real-time Community Chat & Focus Space.
- [x] **Phase 6:** Bug Fixing, Type checking & Build Production.
- [ ] **Phase 7:** Release MVP & Deploy (Vercel/Netlify).

---

## 🤝 Đóng góp
Chúng tôi luôn hoan nghênh sự đóng góp từ cộng đồng! Nếu bạn tìm thấy lỗi (bug) hoặc muốn đề xuất tính năng mới:
1. Fork dự án này.
2. Tạo một branch mới (`git checkout -b feature/AmazingFeature`).
3. Commit các thay đổi của bạn (`git commit -m 'Add some AmazingFeature'`).
4. Push lên branch đó (`git push origin feature/AmazingFeature`).
5. Tạo một Pull Request mới.

---

<div align="center">
  <p>Được thiết kế và phát triển bằng 💖 dành cho cộng đồng học tập.</p>
</div>