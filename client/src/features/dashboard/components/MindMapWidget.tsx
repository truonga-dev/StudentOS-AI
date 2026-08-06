import { useState, useRef, useCallback, useEffect } from 'react'
import { Plus, Minus, RotateCcw, ZoomIn, ZoomOut, Maximize2, BookOpen } from 'lucide-react'
import { clsx } from 'clsx'
import { useNavigate } from 'react-router-dom'

interface Subject { id: string; title: string; color?: string; credits?: number }
interface Task    { id: string; title: string; subject_id?: string | null; completed: boolean; priority?: string }

interface MindMapWidgetProps {
  subjects: Subject[]
  tasks: Task[]
  userName?: string
}

interface Node {
  id: string
  label: string
  x: number
  y: number
  color: string
  type: 'center' | 'subject' | 'task'
  subjectId?: string
  collapsed?: boolean
  completed?: boolean
}

const CENTER_X = 340
const CENTER_Y = 240
const SUBJECT_R = 140
const TASK_R    = 240

function getArc(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2
  const my = (y1 + y2) / 2
  const dx = x2 - x1
  const dy = y2 - y1
  const nx = -dy * 0.25
  const ny = dx * 0.25
  return `M ${x1} ${y1} Q ${mx + nx} ${my + ny} ${x2} ${y2}`
}

function truncate(text: string, maxLen = 14): string {
  return text.length > maxLen ? text.slice(0, maxLen) + '…' : text
}

export function MindMapWidget({ subjects, tasks, userName = 'Học tập' }: MindMapWidgetProps) {
  const navigate = useNavigate()
  const svgRef   = useRef<SVGSVGElement>(null)
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const [zoom, setZoom]           = useState(1)
  const [pan, setPan]             = useState({ x: 0, y: 0 })
  const [dragging, setDragging]   = useState(false)
  const dragStart = useRef<{ mx: number; my: number; px: number; py: number } | null>(null)

  // Build nodes
  const subjectNodes: Node[] = subjects.slice(0, 8).map((sub, i) => {
    const angle = (i / Math.min(subjects.length, 8)) * 2 * Math.PI - Math.PI / 2
    return {
      id:    `sub-${sub.id}`,
      label: sub.title,
      x:     CENTER_X + SUBJECT_R * Math.cos(angle),
      y:     CENTER_Y + SUBJECT_R * Math.sin(angle),
      color: sub.color || '#6B4EFF',
      type:  'subject',
      subjectId: sub.id,
    }
  })

  const taskNodes: Node[] = []
  subjectNodes.forEach(sn => {
    if (collapsed[sn.id]) return
    const subId   = sn.subjectId!
    const subTasks = tasks.filter(t => t.subject_id === subId && !t.completed).slice(0, 3)
    subTasks.forEach((t, ti) => {
      const angle = Math.atan2(sn.y - CENTER_Y, sn.x - CENTER_X) + ((ti - (subTasks.length - 1) / 2) * 0.4)
      taskNodes.push({
        id:       `task-${t.id}`,
        label:    t.title,
        x:        CENTER_X + TASK_R * Math.cos(angle),
        y:        CENTER_Y + TASK_R * Math.sin(angle),
        color:    sn.color,
        type:     'task',
        subjectId: subId,
        completed: t.completed,
      })
    })
  })

  // Pan handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as SVGElement).closest('[data-node]')) return
    setDragging(true)
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y }
  }, [pan])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart.current) return
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    })
  }, [dragging])

  const onMouseUp = useCallback(() => { setDragging(false); dragStart.current = null }, [])

  const toggleCollapse = (nodeId: string) => {
    setCollapsed(c => ({ ...c, [nodeId]: !c[nodeId] }))
  }

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }) }

  const allNodes = subjectNodes // Center is drawn separately

  return (
    <div className="card p-0 overflow-hidden flex flex-col" style={{ minHeight: 360 }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-100 dark:border-surface-800 shrink-0">
        <div>
          <h3 className="section-title text-base">Bản đồ tư duy</h3>
          <p className="section-subtitle text-xs">{subjects.length} môn · {tasks.filter(t => !t.completed).length} task đang làm</p>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => setZoom(z => Math.min(2, z + 0.15))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button onClick={resetView}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-surface-500 hover:bg-surface-100 dark:hover:bg-surface-800 transition-colors">
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* SVG canvas */}
      <div className="flex-1 relative bg-surface-50 dark:bg-surface-900/50 overflow-hidden" style={{ minHeight: 320 }}>
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mm-grid" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="12" cy="12" r="0.8" fill="currentColor" className="text-surface-200 dark:text-surface-700" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mm-grid)" />
        </svg>

        <svg
          ref={svgRef}
          width="100%" height="100%"
          className={clsx('absolute inset-0 select-none', dragging ? 'cursor-grabbing' : 'cursor-grab')}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
          viewBox="0 0 680 480"
        >
          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`} style={{ transformOrigin: '340px 240px' }}>

            {/* Lines: center → subject */}
            {subjectNodes.map(sn => (
              <path key={`l-${sn.id}`}
                d={getArc(CENTER_X, CENTER_Y, sn.x, sn.y)}
                fill="none" stroke={sn.color} strokeWidth="2" strokeOpacity="0.4"
                strokeDasharray={collapsed[sn.id] ? '4 3' : ''}
              />
            ))}

            {/* Lines: subject → task */}
            {taskNodes.map(tn => {
              const sn = subjectNodes.find(s => s.subjectId === tn.subjectId)
              if (!sn) return null
              return (
                <path key={`lt-${tn.id}`}
                  d={getArc(sn.x, sn.y, tn.x, tn.y)}
                  fill="none" stroke={tn.color} strokeWidth="1.5" strokeOpacity="0.3" strokeDasharray="3 2" />
              )
            })}

            {/* Task nodes */}
            {taskNodes.map(tn => (
              <g key={tn.id} data-node="true"
                className="cursor-pointer"
                onClick={() => navigate('/tasks')}>
                <rect x={tn.x - 48} y={tn.y - 14} width="96" height="28"
                  rx="8" fill="white" className="dark:fill-surface-800"
                  stroke={tn.color} strokeWidth="1.5" strokeOpacity="0.5" />
                <text x={tn.x} y={tn.y + 4}
                  textAnchor="middle" fontSize="9" fontWeight="500"
                  fill="currentColor" className="fill-surface-700 dark:fill-surface-300 pointer-events-none">
                  {truncate(tn.label, 12)}
                </text>
              </g>
            ))}

            {/* Subject nodes */}
            {subjectNodes.map(sn => {
              const subTaskCount = tasks.filter(t => t.subject_id === sn.subjectId && !t.completed).length
              return (
                <g key={sn.id} data-node="true" className="cursor-pointer"
                  onClick={() => toggleCollapse(sn.id)}>
                  <circle cx={sn.x} cy={sn.y} r="34"
                    fill={`${sn.color}18`} stroke={sn.color} strokeWidth="2.5" />
                  {/* Glow */}
                  <circle cx={sn.x} cy={sn.y} r="34" fill="none"
                    stroke={sn.color} strokeWidth="8" strokeOpacity="0.1" />
                  <foreignObject x={sn.x - 26} y={sn.y - 14} width="52" height="28"
                    className="pointer-events-none overflow-visible">
                    <div className="flex flex-col items-center justify-center h-full">
                      <span className="text-[9px] font-bold text-center leading-tight px-1"
                        style={{ color: sn.color }}>
                        {truncate(sn.label, 8)}
                      </span>
                    </div>
                  </foreignObject>
                  {/* Expand/collapse */}
                  <circle cx={sn.x + 24} cy={sn.y - 24} r="9"
                    fill={sn.color} stroke="white" strokeWidth="1.5" />
                  <text x={sn.x + 24} y={sn.y - 20} textAnchor="middle" fontSize="12"
                    fill="white" fontWeight="700" className="pointer-events-none">
                    {collapsed[sn.id] ? '+' : '−'}
                  </text>
                  {/* Task count badge */}
                  {subTaskCount > 0 && !collapsed[sn.id] && (
                    <circle cx={sn.x - 24} cy={sn.y - 24} r="9"
                      fill="#f59e0b" stroke="white" strokeWidth="1.5">
                      <title>{subTaskCount} task</title>
                    </circle>
                  )}
                  {subTaskCount > 0 && !collapsed[sn.id] && (
                    <text x={sn.x - 24} y={sn.y - 20} textAnchor="middle" fontSize="9"
                      fill="white" fontWeight="700" className="pointer-events-none">
                      {subTaskCount}
                    </text>
                  )}
                </g>
              )
            })}

            {/* Center node */}
            <g data-node="true">
              <circle cx={CENTER_X} cy={CENTER_Y} r="46"
                fill="url(#mmcenter)" stroke="#6B4EFF" strokeWidth="3" />
              <circle cx={CENTER_X} cy={CENTER_Y} r="52"
                fill="none" stroke="#6B4EFF" strokeWidth="6" strokeOpacity="0.12" />
              <defs>
                <radialGradient id="mmcenter" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#6B4EFF" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#6B4EFF" stopOpacity="0.12" />
                </radialGradient>
              </defs>
              <text x={CENTER_X} y={CENTER_Y - 4} textAnchor="middle" fontSize="11" fontWeight="700"
                fill="#6B4EFF" className="pointer-events-none">
                🎓
              </text>
              <text x={CENTER_X} y={CENTER_Y + 12} textAnchor="middle" fontSize="9" fontWeight="600"
                fill="#6B4EFF" className="pointer-events-none">
                {truncate(userName, 10)}
              </text>
            </g>
          </g>
        </svg>

        {/* Empty state */}
        {subjects.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <BookOpen className="w-10 h-10 text-surface-300 dark:text-surface-600" />
            <p className="text-sm text-surface-500">Thêm môn học để xây bản đồ tư duy</p>
            <button onClick={() => navigate('/subjects')}
              className="text-xs font-semibold text-primary-500 hover:text-primary-600">
              + Thêm môn học
            </button>
          </div>
        )}
      </div>

      {/* Footer hint */}
      <div className="px-4 py-2 border-t border-surface-100 dark:border-surface-800 flex items-center justify-between shrink-0">
        <p className="text-[10px] text-surface-400">Click node để ẩn/hiện task · Kéo để di chuyển</p>
        <p className="text-[10px] text-surface-400 font-mono">{Math.round(zoom * 100)}%</p>
      </div>
    </div>
  )
}
