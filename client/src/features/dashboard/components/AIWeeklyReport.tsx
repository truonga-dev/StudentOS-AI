import { useState, useEffect } from 'react'
import { Sparkles, FileText, Loader2, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '@/lib/supabase'

export function AIWeeklyReport() {
  const [loading, setLoading] = useState(false)
  const [report, setReport] = useState<string | null>(null)
  
  const fetchLatestReport = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    
    const { data, error } = await supabase
      .from('ai_reports')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      
    if (data && !error) {
      setReport(data.content)
    }
  }

  useEffect(() => {
    fetchLatestReport()
  }, [])

  const generateReport = async () => {
    setLoading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error("Chưa đăng nhập")

      const today = new Date()
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay() + (today.getDay() === 0 ? -6 : 1))
      startOfWeek.setHours(0, 0, 0, 0)
      
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)

      const response = await fetch(`${import.meta.env.VITE_API_URL}/ai/generate-weekly-report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          week_start: startOfWeek.toISOString(),
          week_end: endOfWeek.toISOString()
        })
      })

      const result = await response.json()
      
      if (!response.ok) {
        throw new Error(result.detail || 'Lỗi khi tạo báo cáo')
      }

      setReport(result.content)
      toast.success('Đã tạo báo cáo tuần thành công!')
    } catch (error: any) {
      toast.error(error.message || 'Có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-500/10 flex items-center justify-center text-primary-500">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="section-title">AI Cố vấn học tập</h3>
        </div>
        <button 
          onClick={generateReport}
          disabled={loading}
          className="btn btn-outline text-xs py-1.5 px-3 h-auto"
        >
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Tạo mới'}
        </button>
      </div>
      
      {report ? (
        <div className="bg-surface-50 dark:bg-surface-900 rounded-xl p-4 prose prose-sm dark:prose-invert max-w-none text-surface-600 dark:text-surface-300">
          <div dangerouslySetInnerHTML={{ __html: report }} />
        </div>
      ) : (
        <div className="text-center py-6">
          <FileText className="w-8 h-8 text-surface-300 mx-auto mb-2" />
          <p className="text-sm text-surface-500">Chưa có báo cáo tuần nào.</p>
          <p className="text-xs text-surface-400 mt-1">Bấm "Tạo mới" để AI tổng hợp kết quả học tập của bạn.</p>
        </div>
      )}
    </div>
  )
}
