import { Outlet } from 'react-router-dom'
import { GraduationCap, Sparkles, LayoutDashboard, BrainCircuit, CalendarCheck, Zap } from 'lucide-react'

export function AuthLayout() {
  return (
    <div className="min-h-screen bg-surface-50 dark:bg-surface-950 flex font-sans overflow-hidden">
      
      {/* Left panel — Premium Branding */}
      <div className="hidden lg:flex lg:w-[500px] xl:w-[600px] flex-col justify-between p-14
                      bg-[#0f172a] relative overflow-hidden">
        
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[500px] h-[500px] rounded-full 
                          bg-primary-600/30 blur-[100px] animate-blob mix-blend-screen" />
          <div className="absolute top-[20%] -right-[20%] w-[600px] h-[600px] rounded-full 
                          bg-accent-600/20 blur-[120px] animate-blob animation-delay-2000 mix-blend-screen" />
          <div className="absolute -bottom-[10%] left-[10%] w-[400px] h-[400px] rounded-full 
                          bg-indigo-600/30 blur-[100px] animate-blob animation-delay-4000 mix-blend-screen" />
        </div>

        {/* Logo Area */}
        <div className="relative z-10 flex items-center gap-4 animate-fade-in">
          <div className="relative flex items-center justify-center w-14 h-14 rounded-2xl 
                          bg-gradient-to-br from-primary-500 to-accent-600 shadow-[0_0_30px_rgba(107,78,255,0.4)]
                          before:absolute before:inset-0 before:rounded-2xl before:bg-white/10 before:backdrop-blur-md">
            <GraduationCap className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl tracking-tight leading-none">Student OS</h1>
            <p className="text-primary-300 font-medium text-sm mt-1 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Powered Workspace
            </p>
          </div>
        </div>

        {/* Hero Content */}
        <div className="relative z-10 space-y-8 mt-12 animate-slide-up">
          <h2 className="text-[2.75rem] font-extrabold text-transparent bg-clip-text 
                         bg-gradient-to-br from-white via-white to-white/60 leading-[1.15] tracking-tight">
            Học tập thông minh,<br/> không tốn sức.
          </h2>
          <p className="text-surface-300 text-lg leading-relaxed max-w-[420px] font-medium">
            Tất cả những gì bạn cần để chinh phục mọi học kỳ — deadline, tài liệu, flashcard, và một trợ lý AI đồng hành.
          </p>

          {/* Premium Feature List */}
          <div className="grid grid-cols-1 gap-5 pt-4">
            {[
              { icon: CalendarCheck, text: 'Quản lý lịch học & deadline tự động', color: 'text-emerald-400' },
              { icon: BrainCircuit, text: 'Chat với tài liệu PDF siêu tốc bằng AI', color: 'text-primary-400' },
              { icon: Zap, text: 'Tự động tạo Flashcard từ bài giảng', color: 'text-amber-400' },
              { icon: LayoutDashboard, text: 'Theo dõi GPA & tiến độ thời gian thực', color: 'text-sky-400' },
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4 group">
                <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 
                                flex items-center justify-center backdrop-blur-sm
                                group-hover:scale-110 group-hover:bg-white/10 transition-all duration-300`}>
                  <feature.icon className={`w-5 h-5 ${feature.color}`} strokeWidth={2.5} />
                </div>
                <span className="text-white/80 font-medium text-[15px] group-hover:text-white transition-colors duration-300">
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial Card - Glassmorphism */}
        <div className="relative z-10 mt-12 animate-slide-up" style={{ animationDelay: '0.2s' }}>
          <div className="relative p-6 rounded-3xl bg-white/[0.03] border border-white/10 backdrop-blur-xl 
                          overflow-hidden group hover:bg-white/[0.05] transition-colors duration-500">
            {/* Subtle inner glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <p className="text-white/90 text-[15px] italic leading-relaxed relative z-10">
              "Student OS AI thực sự thay đổi cách mình học tập. Mình không còn bị trễ deadline, và việc ôn thi bằng Flashcard AI giúp điểm số cải thiện rõ rệt!"
            </p>
            <div className="mt-5 flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-500 to-primary-600 
                              flex items-center justify-center text-white text-sm font-bold shadow-lg">
                NM
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Nguyễn Minh</p>
                <p className="text-white/50 text-xs font-medium mt-0.5">Sinh viên xuất sắc — HUST</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right panel — form container */}
      <div className="flex-1 flex flex-col relative">
        {/* Subtle background pattern/gradient for right side in dark mode */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] 
                        from-primary-500/5 via-transparent to-transparent pointer-events-none dark:opacity-100 opacity-50" />
        
        <div className="flex-1 flex items-center justify-center p-6 lg:p-12 relative z-10">
          <div className="w-full max-w-[420px] animate-scale-in">
            {/* Mobile logo header */}
            <div className="lg:hidden flex flex-col items-center justify-center gap-4 mb-10">
              <div className="w-14 h-14 bg-gradient-to-br from-primary-500 to-accent-600 rounded-2xl 
                              flex items-center justify-center shadow-[0_0_20px_rgba(107,78,255,0.3)]">
                <GraduationCap className="w-7 h-7 text-white" strokeWidth={2.5} />
              </div>
              <div className="text-center">
                <h1 className="font-bold text-2xl text-surface-900 dark:text-white">Student OS AI</h1>
                <p className="text-sm text-surface-500 dark:text-surface-400 mt-1">Hệ điều hành học tập thông minh</p>
              </div>
            </div>

            <div className="bg-white/60 dark:bg-surface-900/60 backdrop-blur-xl border border-white/40 dark:border-surface-800 
                            rounded-3xl shadow-2xl dark:shadow-none p-8 sm:p-10">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
