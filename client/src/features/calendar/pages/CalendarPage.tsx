import { useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, CheckSquare, Clock, MapPin, Trash2, Loader2, Calendar, LayoutGrid } from 'lucide-react'
import { clsx } from 'clsx'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import { useTasks } from '@/hooks/useTasks'
import { useCalendarEvents } from '@/hooks/useCalendarEvents'
import { useSubjects } from '@/hooks/useSubjects'

const DAYS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS = ['Tháng 1','Tháng 2','Tháng 3','Tháng 4','Tháng 5','Tháng 6','Tháng 7','Tháng 8','Tháng 9','Tháng 10','Tháng 11','Tháng 12']

const PRIORITY_COLOR: Record<string, string> = {
  high:   'bg-danger-500',
  medium: 'bg-warning-500',
  low:    'bg-success-500',
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}
function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay()
}

export function CalendarPage() {
  const today = new Date()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [current, setCurrent] = useState({ year: today.getFullYear(), month: today.getMonth() })
  const [selectedDay, setSelectedDay] = useState<number | null>(today.getDate())
  const [showEventModal, setShowEventModal] = useState(false)
  const [adding, setAdding] = useState(false)
  const [viewMode, setViewMode] = useState<'month' | 'week'>('month')

  const { tasks } = useTasks()
  const { events, addEvent, removeEvent } = useCalendarEvents(current.year, current.month)
  const { subjects } = useSubjects()

  const [form, setForm] = useState({
    title: '',
    subject_id: '',
    start_time: '',
    end_time: '',
    room: '',
    color: '#6366f1',
    is_recurring: false,
    recurrence_pattern: 'weekly',
  })

  const prev = () => {
    setCurrent(c => c.month === 0 ? { year: c.year - 1, month: 11 } : { ...c, month: c.month - 1 })
    setSelectedDay(null)
  }
  const next = () => {
    setCurrent(c => c.month === 11 ? { year: c.year + 1, month: 0 } : { ...c, month: c.month + 1 })
    setSelectedDay(null)
  }

  // ── Map data by day ────────────────────────────────────────────────────────

  // Tasks (due_date)
  const tasksByDay = tasks.reduce<Record<number, typeof tasks>>((acc, task) => {
    if (!task.due_date) return acc
    const d = new Date(task.due_date)
    if (d.getFullYear() === current.year && d.getMonth() === current.month) {
      const day = d.getDate()
      acc[day] = acc[day] ?? []
      acc[day].push(task)
    }
    return acc
  }, {})

  // Events (start_time)
  const eventsByDay = events.reduce<Record<number, typeof events>>((acc, event) => {
    const d = new Date(event.start_time)
    if (d.getFullYear() === current.year && d.getMonth() === current.month) {
      const day = d.getDate()
      acc[day] = acc[day] ?? []
      acc[day].push(event)
    }
    return acc
  }, {})

  const daysInMonth = getDaysInMonth(current.year, current.month)
  const firstDay = getFirstDayOfMonth(current.year, current.month)
  const cells = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)]

  // ── Week View Data ─────────────────────────────────────────────────────────
  const activeDate = useMemo(() => {
    return new Date(current.year, current.month, selectedDay || today.getDate())
  }, [current.year, current.month, selectedDay])

  const weekDays = useMemo(() => {
    const startOfWeek = new Date(activeDate)
    startOfWeek.setDate(activeDate.getDate() - activeDate.getDay()) // Sunday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return d
    })
  }, [activeDate])

  const HOURS = Array.from({ length: 16 }, (_, i) => i + 7) // 07:00 to 22:00

  // ── Selected Day Data ──────────────────────────────────────────────────────
  const selectedTasks = selectedDay ? (tasksByDay[selectedDay] ?? []) : []
  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] ?? []) : []
  
  const selectedDate = selectedDay
    ? new Date(current.year, current.month, selectedDay).toLocaleDateString('vi-VN', {
        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
      })
    : null

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.title || !form.start_time) return
    setAdding(true)
    try {
      await addEvent({
        title: form.title,
        subject_id: form.subject_id || undefined,
        start_time: form.start_time,
        end_time: form.end_time || form.start_time,
        room: form.room || undefined,
        color: form.color,
        recurrence: form.is_recurring ? 'weekly' : 'once',
      })
      setShowEventModal(false)
      setForm({ ...form, title: '', start_time: '', end_time: '', room: '' })
    } catch (err) {
      console.error(err)
    } finally {
      setAdding(false)
    }
  }

  // Tiện ích để click ngày tự động điền form
  const openModalForDate = (day: number | null) => {
    if (day) {
      const d = new Date(current.year, current.month, day)
      // Set to 8:00 AM in local timezone to string like YYYY-MM-DDTHH:mm
      d.setHours(8, 0, 0, 0)
      const tzoffset = (new Date()).getTimezoneOffset() * 60000; 
      const localISOTime = (new Date(d.getTime() - tzoffset)).toISOString().slice(0, 16);
      
      setForm(f => ({ ...f, start_time: localISOTime }))
    }
    setShowEventModal(true)
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="section-title text-xl">Lịch học</h2>
          <p className="section-subtitle mt-0.5">Quản lý lịch học và deadline</p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
          {!isMobile && (
            <div className="bg-surface-100 dark:bg-surface-800 p-1 rounded-xl flex items-center">
              <button
                onClick={() => setViewMode('month')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                  viewMode === 'month' ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm" : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                )}
              >
                <LayoutGrid className="w-4 h-4" /> Tháng
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={clsx(
                  "px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors",
                  viewMode === 'week' ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-sm" : "text-surface-500 hover:text-surface-700 dark:hover:text-surface-300"
                )}
              >
                <Calendar className="w-4 h-4" /> Tuần
              </button>
            </div>
          )}
          <button
            onClick={() => openModalForDate(selectedDay)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold shadow-glow-sm hover:opacity-90 transition-all w-full md:w-auto justify-center"
          >
            <Plus className="w-4 h-4" />Thêm sự kiện
          </button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Calendar */}
        <div className={clsx("card p-6 flex-1", isMobile ? "w-full overflow-hidden" : "overflow-x-auto min-w-[500px]")}>
          {/* Nav */}
          <div className="flex items-center justify-between mb-6">
            <button 
              onClick={() => {
                if (viewMode === 'month') {
                  prev()
                } else {
                  const newActive = new Date(activeDate)
                  newActive.setDate(activeDate.getDate() - 7)
                  if (newActive.getMonth() !== current.month) {
                    setCurrent({ year: newActive.getFullYear(), month: newActive.getMonth() })
                  }
                  setSelectedDay(newActive.getDate())
                }
              }} 
              className="w-9 h-9 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-surface-500" />
            </button>
            <h3 className="font-semibold text-surface-900 dark:text-white">
              {viewMode === 'month' ? (
                `${MONTHS[current.month]} ${current.year}`
              ) : (
                `Tuần ${weekDays[0].getDate()}/${weekDays[0].getMonth() + 1} - ${weekDays[6].getDate()}/${weekDays[6].getMonth() + 1}`
              )}
            </h3>
            <button 
              onClick={() => {
                if (viewMode === 'month') {
                  next()
                } else {
                  const newActive = new Date(activeDate)
                  newActive.setDate(activeDate.getDate() + 7)
                  if (newActive.getMonth() !== current.month) {
                    setCurrent({ year: newActive.getFullYear(), month: newActive.getMonth() })
                  }
                  setSelectedDay(newActive.getDate())
                }
              }} 
              className="w-9 h-9 rounded-xl hover:bg-surface-100 dark:hover:bg-surface-700 flex items-center justify-center transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-surface-500" />
            </button>
          </div>

          {viewMode === 'month' ? (
            <>
              {/* Day labels */}
          <div className="grid grid-cols-7 mb-2">
            {DAYS.map(d => (
              <div key={d} className="text-center text-xs font-semibold text-surface-400 py-2">{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div className={clsx("grid grid-cols-7 gap-1", isMobile ? "min-h-[280px]" : "min-h-[500px]")}>
            {cells.map((day, i) => {
              const isToday = day === today.getDate() && current.month === today.getMonth() && current.year === today.getFullYear()
              const isSelected = day === selectedDay
              const dayTasks = day ? (tasksByDay[day] ?? []) : []
              const dayEvents = day ? (eventsByDay[day] ?? []) : []
              
              const allItems = [...dayEvents, ...dayTasks]
              const hasItems = allItems.length > 0

              return (
                <div
                  key={i}
                  onClick={() => day && setSelectedDay(day)}
                  className={clsx(
                    'p-1.5 rounded-xl transition-colors cursor-pointer group flex flex-col justify-start',
                    isMobile ? 'min-h-[48px]' : 'min-h-[100px]',
                    day ? 'hover:bg-surface-50 dark:hover:bg-surface-800' : 'pointer-events-none opacity-0',
                    isToday && !isSelected ? 'bg-primary-50 dark:bg-primary-500/10' : '',
                    isSelected ? 'bg-primary-100 dark:bg-primary-500/20 ring-2 ring-primary-400 dark:ring-primary-500' : '',
                  )}
                >
                  {day && (
                    <>
                      <span className={clsx(
                        'w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium mb-1 mx-auto transition-colors',
                        isToday ? 'bg-primary-500 text-white' : 'text-surface-700 dark:text-surface-300',
                      )}>
                        {day}
                      </span>
                      {isMobile ? (
                        hasItems && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary-500 mx-auto mt-0.5" />
                        )
                      ) : (
                        <div className="space-y-0.5 overflow-hidden max-h-[60px]">
                          {/* Hiển thị Events trước */}
                          {dayEvents.slice(0, 2).map((event) => (
                            <div
                              key={event.id}
                              className="px-1.5 py-0.5 rounded text-[10px] text-white truncate shadow-sm"
                              style={{ backgroundColor: event.color || '#6366f1' }}
                            >
                              {event.start_time && new Date(event.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {event.title}
                            </div>
                          ))}
                          {/* Sau đó là Tasks */}
                          {dayTasks.slice(0, 2 - Math.min(dayEvents.length, 2)).map((task) => (
                            <div
                              key={task.id}
                              className={clsx(
                                'px-1.5 py-0.5 rounded text-[10px] text-white truncate shadow-sm flex items-center gap-1',
                                PRIORITY_COLOR[task.priority],
                                task.completed && 'opacity-50 line-through'
                              )}
                            >
                              <CheckSquare className="w-3 h-3 shrink-0" />
                              {task.title}
                            </div>
                          ))}
                          
                          {allItems.length > 2 && (
                            <div className="text-[10px] text-surface-400 pl-1 font-medium text-center">+{allItems.length - 2} nữa</div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
            </>
          ) : (
            <div className="min-w-[600px] border border-surface-200 dark:border-surface-700 rounded-xl overflow-hidden bg-white dark:bg-surface-900 flex flex-col h-[600px]">
              {/* Week header */}
              <div className="grid grid-cols-8 border-b border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800">
                <div className="border-r border-surface-200 dark:border-surface-700" />
                {weekDays.map((d, i) => {
                  const isToday = d.getDate() === today.getDate() && d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear()
                  return (
                    <div 
                      key={i} 
                      onClick={() => {
                        if (d.getMonth() !== current.month) setCurrent({ year: d.getFullYear(), month: d.getMonth() })
                        setSelectedDay(d.getDate())
                      }}
                      className={clsx(
                        "text-center py-2 border-r border-surface-200 dark:border-surface-700 last:border-r-0 cursor-pointer transition-colors",
                        isToday ? "text-primary-600 dark:text-primary-400 font-bold" : "text-surface-500",
                        selectedDay === d.getDate() && current.month === d.getMonth() ? "bg-primary-50 dark:bg-primary-500/10" : "hover:bg-surface-100 dark:hover:bg-surface-700"
                      )}
                    >
                      <div className="text-xs">{DAYS[i]}</div>
                      <div className={clsx("text-lg", isToday && "text-primary-500")}>{d.getDate()}</div>
                    </div>
                  )
                })}
              </div>
              {/* Time grid */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <div className="grid grid-cols-8 relative min-h-[800px]">
                  {/* Hours column */}
                  <div className="border-r border-surface-200 dark:border-surface-700 relative">
                    {HOURS.map(hour => (
                      <div key={hour} className="h-16 border-b border-surface-200 dark:border-surface-700 text-right pr-2 text-xs text-surface-400 font-medium relative">
                        <span className="absolute -top-2.5 right-2 bg-white dark:bg-surface-900 px-1">{hour}:00</span>
                      </div>
                    ))}
                  </div>
                  {/* Day columns */}
                  {weekDays.map((d, colIndex) => {
                    // Gather events & tasks for this specific date from our existing states
                    // Actually we need to search through events because eventsByDay is scoped to current.month
                    const dayEvents = events.filter(e => {
                      const ed = new Date(e.start_time)
                      return ed.getDate() === d.getDate() && ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear()
                    })
                    const dayTasks = tasks.filter(t => {
                      if (!t.due_date) return false
                      const td = new Date(t.due_date)
                      return td.getDate() === d.getDate() && td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear()
                    })
                    
                    return (
                      <div key={colIndex} className="border-r border-surface-200 dark:border-surface-700 last:border-r-0 relative">
                        {HOURS.map(hour => (
                          <div key={hour} className="h-16 border-b border-surface-200 dark:border-surface-700 border-dashed" />
                        ))}
                        
                        {/* Render Events as absolute blocks */}
                        {dayEvents.map(event => {
                          const ed = new Date(event.start_time)
                          const startHour = ed.getHours() + ed.getMinutes() / 60
                          // Ensure we only render events within our visible hours (7 to 22)
                          if (startHour < 7 || startHour >= 23) return null
                          
                          let duration = 1 // Default 1 hour
                          if (event.end_time) {
                            const endD = new Date(event.end_time)
                            duration = (endD.getTime() - ed.getTime()) / (1000 * 60 * 60)
                          }
                          const top = (startHour - 7) * 4 // 4rem (h-16) per hour
                          const height = Math.max(duration * 4, 1.5) // Min height
                          
                          return (
                            <div 
                              key={event.id}
                              className="absolute left-1 right-1 rounded-md p-1.5 text-[10px] leading-tight text-white shadow-sm overflow-hidden z-10 hover:z-20 transition-all hover:ring-2 ring-white/50 cursor-pointer"
                              style={{ 
                                top: `${top}rem`, 
                                height: `${height}rem`, 
                                backgroundColor: event.color || '#6366f1' 
                              }}
                              onClick={() => {
                                if (d.getMonth() !== current.month) setCurrent({ year: d.getFullYear(), month: d.getMonth() })
                                setSelectedDay(d.getDate())
                              }}
                            >
                              <div className="font-semibold truncate">{event.title}</div>
                              <div className="truncate opacity-90">{ed.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} {event.room ? `- ${event.room}` : ''}</div>
                            </div>
                          )
                        })}

                        {/* Render Tasks as absolute blocks (duration ~30mins) */}
                        {dayTasks.map((task, idx) => {
                          const td = new Date(task.due_date!)
                          const startHour = td.getHours() + td.getMinutes() / 60
                          if (startHour < 7 || startHour >= 23) return null
                          
                          // Offset tasks slightly to the right to avoid overlapping exact times
                          const top = (startHour - 7) * 4
                          
                          return (
                            <div 
                              key={task.id}
                              className={clsx(
                                "absolute right-1 w-3/4 rounded-md p-1.5 text-[10px] leading-tight text-white shadow-sm overflow-hidden z-20 flex flex-col gap-0.5 border border-white/20 cursor-pointer",
                                PRIORITY_COLOR[task.priority],
                                task.completed && "opacity-50"
                              )}
                              style={{ 
                                top: `${top}rem`, 
                                height: `1.75rem`,
                              }}
                              onClick={() => {
                                if (d.getMonth() !== current.month) setCurrent({ year: d.getFullYear(), month: d.getMonth() })
                                setSelectedDay(d.getDate())
                              }}
                            >
                              <div className="font-semibold truncate flex items-center gap-1">
                                <CheckSquare className="w-2.5 h-2.5 shrink-0" />
                                {task.title}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Day panel */}
        <div className="w-full lg:w-80 shrink-0 card p-5 flex flex-col gap-4 max-h-[800px]">
          <div>
            <h3 className="font-semibold text-surface-900 dark:text-white text-sm">
              {selectedDate ?? 'Chọn ngày để xem'}
            </h3>
            {selectedDay && (
              <p className="text-xs text-surface-400 mt-0.5">
                {selectedEvents.length} sự kiện · {selectedTasks.length} tasks
              </p>
            )}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto pr-2 custom-scrollbar">
            {selectedEvents.length === 0 && selectedTasks.length === 0 ? (
              <div className="text-center py-8 text-surface-400">
                <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Không có lịch trình</p>
              </div>
            ) : (
              <>
                {/* Sự kiện (Events) */}
                {selectedEvents.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">Sự kiện</h4>
                    {selectedEvents.map(event => (
                      <div
                        key={event.id}
                        className="p-3 rounded-xl border-l-4 text-sm bg-surface-50 dark:bg-surface-800 relative group"
                        style={{ borderLeftColor: event.color || '#6366f1' }}
                      >
                        <button
                          onClick={() => confirm('Xóa sự kiện này?') && removeEvent(event.id)}
                          className="absolute right-2 top-2 p-1.5 rounded-lg text-danger-500 hover:bg-danger-50 dark:hover:bg-danger-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <p className="font-medium text-surface-800 dark:text-surface-200 pr-6">
                          {event.title}
                        </p>
                        {event.subjects && (
                          <p className="text-xs text-surface-400 mt-1">{event.subjects.title}</p>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-surface-500">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(event.start_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                            {event.end_time && ` - ${new Date(event.end_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`}
                          </span>
                          {event.room && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3.5 h-3.5" /> {event.room}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tasks (Deadline) */}
                {selectedTasks.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 mt-4">Task Deadline</h4>
                    {selectedTasks.map(task => (
                      <div
                        key={task.id}
                        className={clsx(
                          'p-3 rounded-xl border-l-4 text-sm',
                          `border-l-[${task.priority === 'high' ? '#ef4444' : task.priority === 'medium' ? '#f59e0b' : '#22c55e'}]`,
                          'bg-surface-50 dark:bg-surface-800',
                          task.completed && 'opacity-50'
                        )}
                      >
                        <p className={clsx('font-medium text-surface-800 dark:text-surface-200', task.completed && 'line-through')}>
                          {task.title}
                        </p>
                        {task.subjects && (
                          <p className="text-xs text-surface-400 mt-1">{task.subjects.title}</p>
                        )}
                        {task.due_date && (
                          <p className="text-xs text-surface-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {new Date(task.due_date).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Add Event Modal */}
      {showEventModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setShowEventModal(false)}
        >
          <div
            className="bg-white dark:bg-surface-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl animate-scale-in"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold text-surface-900 dark:text-white mb-5">Thêm sự kiện lịch</h3>
            <form onSubmit={handleAddEvent} className="space-y-4">
              
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Tên sự kiện *</label>
                <input
                  className="input"
                  placeholder="Ví dụ: Học Bù Toán Rời Rạc"
                  value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  required
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Môn học</label>
                  <select
                    className="input"
                    value={form.subject_id}
                    onChange={e => setForm(f => ({ ...f, subject_id: e.target.value }))}
                  >
                    <option value="">(Không chọn)</option>
                    {subjects.map(s => (
                      <option key={s.id} value={s.id}>{s.title}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Phòng học / Địa điểm</label>
                  <input
                    className="input"
                    placeholder="Ví dụ: B1-301"
                    value={form.room}
                    onChange={e => setForm(f => ({ ...f, room: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Bắt đầu *</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.start_time}
                    onChange={e => setForm(f => ({ ...f, start_time: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Kết thúc</label>
                  <input
                    type="datetime-local"
                    className="input"
                    value={form.end_time}
                    onChange={e => setForm(f => ({ ...f, end_time: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-6 items-center">
                <div className="space-y-1.5 flex-1">
                  <label className="text-sm font-medium text-surface-700 dark:text-surface-300">Màu sắc</label>
                  <div className="flex gap-2">
                    {['#6366f1', '#06b6d4', '#22c55e', '#f59e0b', '#ef4444', '#ec4899'].map(c => (
                      <button
                        key={c} type="button"
                        onClick={() => setForm(f => ({ ...f, color: c }))}
                        className={clsx(
                          'w-7 h-7 rounded-lg transition-all duration-150',
                          form.color === c && 'ring-2 ring-offset-2 ring-surface-900 dark:ring-white scale-110'
                        )}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer pt-6">
                    <input
                      type="checkbox"
                      className="w-4 h-4 rounded border-surface-300 text-primary-600 focus:ring-primary-500"
                      checked={form.is_recurring}
                      onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                    />
                    <span className="text-sm font-medium text-surface-700 dark:text-surface-300">Lặp lại hằng tuần</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEventModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-surface-200 dark:border-surface-700 text-sm font-medium text-surface-600 dark:text-surface-400 hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={adding}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-brand text-white text-sm font-semibold hover:opacity-90 transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {adding && <Loader2 className="w-4 h-4 animate-spin" />}
                  {adding ? 'Đang lưu...' : 'Thêm sự kiện'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
