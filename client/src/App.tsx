import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'

// Auth pages
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { RegisterPage } from '@/features/auth/pages/RegisterPage'

import { ForgotPasswordPage } from '@/features/auth/pages/ForgotPasswordPage'
import { ResetPasswordPage } from '@/features/auth/pages/ResetPasswordPage'

// App pages
import { DashboardPage } from '@/features/dashboard/pages/DashboardPage'
import { FocusSpacePage } from '@/features/dashboard/pages/FocusSpacePage'
import { SubjectsPage } from '@/features/subjects/pages/SubjectsPage'
import { CalendarPage } from '@/features/calendar/pages/CalendarPage'
import { TasksPage } from '@/features/tasks/pages/TasksPage'
import { NotesPage } from '@/features/notes/pages/NotesPage'
import { FilesPage } from '@/features/files/pages/FilesPage'
import { AnalyticsPage } from '@/features/analytics/pages/AnalyticsPage'
import { SettingsPage } from '@/features/settings/pages/SettingsPage'
import { ChatPage } from '@/features/chat/pages/ChatPage'
import { FlashcardsPage } from '@/features/flashcards/pages/FlashcardsPage'
import { MockTestPage } from '@/features/mocktests/pages/MockTestPage'
import { CommunityChatPage } from '@/features/community/pages/CommunityChatPage'
import { SharedSubjectPage } from '@/features/community/pages/SharedSubjectPage'
import { NotFoundPage } from '@/features/errors/NotFoundPage'

// ─── Guards ──────────────────────────────────────────────────────────────────

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
        <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
      </div>
    )
  }

  // Nếu đã đăng nhập rồi, không cho vào trang login/register
  if (user) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}

// ─── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Auth routes — chỉ cho user chưa login */}
        <Route element={<PublicOnlyRoute><AuthLayout /></PublicOnlyRoute>}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
        </Route>

        {/* Protected app routes */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/focus" element={<FocusSpacePage />} />
          <Route path="/subjects" element={<SubjectsPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/tasks" element={<TasksPage />} />
          <Route path="/notes" element={<NotesPage />} />
          <Route path="/files" element={<FilesPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          <Route path="/community" element={<CommunityChatPage />} />
          <Route path="/flashcards" element={<FlashcardsPage />} />
          <Route path="/mocktests" element={<MockTestPage />} />
        </Route>

        {/* Shared Routes */}
        <Route path="/shared/subject/:id" element={<SharedSubjectPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  )
}
