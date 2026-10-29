import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'

import { lazy, Suspense } from 'react'

// Auth pages
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const RegisterPage = lazy(() => import('@/features/auth/pages/RegisterPage').then(m => ({ default: m.RegisterPage })))
const ForgotPasswordPage = lazy(() => import('@/features/auth/pages/ForgotPasswordPage').then(m => ({ default: m.ForgotPasswordPage })))
const ResetPasswordPage = lazy(() => import('@/features/auth/pages/ResetPasswordPage').then(m => ({ default: m.ResetPasswordPage })))

// App pages
const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const FocusSpacePage = lazy(() => import('@/features/dashboard/pages/FocusSpacePage').then(m => ({ default: m.FocusSpacePage })))
const SubjectsPage = lazy(() => import('@/features/subjects/pages/SubjectsPage').then(m => ({ default: m.SubjectsPage })))
const CalendarPage = lazy(() => import('@/features/calendar/pages/CalendarPage').then(m => ({ default: m.CalendarPage })))
const TasksPage = lazy(() => import('@/features/tasks/pages/TasksPage').then(m => ({ default: m.TasksPage })))
const NotesPage = lazy(() => import('@/features/notes/pages/NotesPage').then(m => ({ default: m.NotesPage })))
const FilesPage = lazy(() => import('@/features/files/pages/FilesPage').then(m => ({ default: m.FilesPage })))
const AnalyticsPage = lazy(() => import('@/features/analytics/pages/AnalyticsPage').then(m => ({ default: m.AnalyticsPage })))
const SettingsPage = lazy(() => import('@/features/settings/pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage').then(m => ({ default: m.ChatPage })))
const FlashcardsPage = lazy(() => import('@/features/flashcards/pages/FlashcardsPage').then(m => ({ default: m.FlashcardsPage })))
const MockTestPage = lazy(() => import('@/features/mocktests/pages/MockTestPage').then(m => ({ default: m.MockTestPage })))
const CommunityChatPage = lazy(() => import('@/features/community/pages/CommunityChatPage').then(m => ({ default: m.CommunityChatPage })))
const SharedSubjectPage = lazy(() => import('@/features/community/pages/SharedSubjectPage').then(m => ({ default: m.SharedSubjectPage })))
const NotFoundPage = lazy(() => import('@/features/errors/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const LeaderboardPage = lazy(() => import('@/features/leaderboard/pages/LeaderboardPage').then(m => ({ default: m.LeaderboardPage })))
// Admin standalone pages
const AdminLayout = lazy(() => import('@/admin/layout/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminLoginPage = lazy(() => import('@/admin/pages/AdminLoginPage').then(m => ({ default: m.AdminLoginPage })))
const AdminDashboardPage = lazy(() => import('@/admin/pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })))
const AdminUsersPage = lazy(() => import('@/admin/pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminReportsPage = lazy(() => import('@/admin/pages/AdminReportsPage').then(m => ({ default: m.AdminReportsPage })))
const AdminCommunityPage = lazy(() => import('@/admin/pages/AdminCommunityPage').then(m => ({ default: m.AdminCommunityPage })))
const AdminContentPage = lazy(() => import('@/admin/pages/AdminContentPage').then(m => ({ default: m.AdminContentPage })))
const AdminBroadcastPage = lazy(() => import('@/admin/pages/AdminBroadcastPage').then(m => ({ default: m.AdminBroadcastPage })))
const AdminAuditLogsPage = lazy(() => import('@/admin/pages/AdminAuditLogsPage').then(m => ({ default: m.AdminAuditLogsPage })))
const AdminSettingsPage = lazy(() => import('@/admin/pages/AdminSettingsPage').then(m => ({ default: m.AdminSettingsPage })))
import { AdminAuthProvider } from '@/admin/context/AdminAuthContext'
import { Outlet } from 'react-router-dom'

function AdminRoot() {
  return (
    <AdminAuthProvider>
      <Outlet />
    </AdminAuthProvider>
  )
}

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
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
          <Loader2 className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      }>
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
            <Route path="/leaderboard" element={<LeaderboardPage />} />
          </Route>

          {/* ─── Standalone Admin Portal (Độc lập hoàn toàn) ─── */}
          <Route path="/admin" element={<AdminRoot />}>
            <Route path="login" element={<AdminLoginPage />} />
            <Route element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="reports" element={<AdminReportsPage />} />
              <Route path="community" element={<AdminCommunityPage />} />
              <Route path="content" element={<AdminContentPage />} />
              <Route path="broadcast" element={<AdminBroadcastPage />} />
              <Route path="audit-logs" element={<AdminAuditLogsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
          </Route>

          {/* Shared Routes */}
          <Route path="/shared/subject/:id" element={<SharedSubjectPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
