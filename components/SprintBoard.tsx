'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Task, CardStatus } from '@/types/card'
import { sprintService, taskService } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import {
  Plus, CheckCircle2, MoreHorizontal, Search, Calendar, Users,
  Zap, BookOpen, ChevronRight, Flag, Check, ChevronDown,
  ArrowLeft, Clock, BarChart2, X, Eye, Trash2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Sprint {
  id: string
  name: string
  goal: string
  startDate: string
  endDate: string
  duration: string
  capacity: string
  label: string
  status: 'active' | 'completed' | 'planned'
  taskIds: string[]
  projectId: number
  completedAt?: string
  taskSnapshots?: Array<{ id: string; title: string; status: string; priority: string; assignee?: string; points?: number }>
  actualEndDate?: string | null
}

// ─── Module-level drag state (shared across all KanbanCol instances) ──────────
// dragId ref inside each KanbanCol loses state when crossing columns.
// A module-level variable is the correct fix for HTML5 drag & drop.
let _dragTaskId: string | null = null
let _dragTaskTitle: string | null = null

// ─── Storage ──────────────────────────────────────────────────────────────────
const STORAGE_KEY = (pid: number) => `sprints_v2_project_${pid}`

function loadSprints(pid: number): Sprint[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY(pid)) || '[]') } catch { return [] }
}
function saveSprints(pid: number, s: Sprint[]) {
  localStorage.setItem(STORAGE_KEY(pid), JSON.stringify(s))
  // Notify other components (e.g. BacklogView) that sprint data changed
  window.dispatchEvent(new CustomEvent('sprintsUpdated', { detail: { projectId: pid } }))
}

// ─── Utilities ────────────────────────────────────────────────────────────────
function fmtDate(s: string) {
  if (!s) return ''
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

// ─── Priority badge ───────────────────────────────────────────────────────────
const PRI: Record<string, [string, string]> = {
  high: ['#fef2f2', '#ef4444'], medium: ['#fff7ed', '#f97316'],
  low: ['#f0fdf4', '#22c55e'], urgent: ['#faf5ff', '#a855f7'],
}
function PriBadge({ p }: { p?: string }) {
  const [bg, c] = PRI[p?.toLowerCase() ?? ''] ?? ['#f3f4f6', '#6b7280']
  return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase" style={{ background: bg, color: c }}>{p ?? '—'}</span>
}

// ─── Status badge ─────────────────────────────────────────────────────────────
const STATUS_MAP: Record<string, [string, string, string]> = {
  todo:       ['To Do',       '#dbeafe', '#2563eb'],
  inprogress: ['In Progress', '#fef9c3', '#ca8a04'],
  done:       ['Done',        '#dcfce7', '#16a34a'],
}
function StatusBadge({ s }: { s?: string }) {
  const [label, bg, c] = STATUS_MAP[s ?? ''] ?? [s ?? '—', '#f3f4f6', '#6b7280']
  return <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold" style={{ background: bg, color: c }}>{label}</span>
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
const AVC = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ec4899','#14b8a6','#f97316']
function Av({ name, size = 6 }: { name?: string; size?: number }) {
  if (!name) return null
  const initials = name.split(' ').filter(Boolean).slice(0, 2).map(n => n[0].toUpperCase()).join('')
  const bg = AVC[name.charCodeAt(0) % AVC.length]
  return (
    <div
      title={name}
      style={{ backgroundColor: bg, width: `${size * 4}px`, height: `${size * 4}px` }}
      className="rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-[10px]"
    >{initials}</div>
  )
}

// ─── Toast ────────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info'
interface ToastItem { id: number; msg: string; type: ToastType }

function ToastContainer({ toasts, remove }: { toasts: ToastItem[]; remove: (id: number) => void }) {
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <div
          key={t.id}
          className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium min-w-[260px]"
          style={{
            background: t.type === 'success' ? 'linear-gradient(135deg,#22c55e,#16a34a)'
              : t.type === 'error' ? 'linear-gradient(135deg,#ef4444,#dc2626)'
              : 'linear-gradient(135deg,#3b82f6,#2563eb)',
            animation: 'sbSlideUp 0.3s ease',
          }}
        >
          <style>{`@keyframes sbSlideUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}`}</style>
          {t.type === 'success' ? <Check className="w-4 h-4 flex-shrink-0" strokeWidth={3} />
            : t.type === 'error' ? <X className="w-4 h-4 flex-shrink-0" />
            : <BarChart2 className="w-4 h-4 flex-shrink-0" />}
          <span className="flex-1">{t.msg}</span>
          <button onClick={() => remove(t.id)} className="opacity-70 hover:opacity-100 text-lg leading-none ml-1">×</button>
        </div>
      ))}
    </div>
  )
}

function useToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const idRef = useRef(0)
  const push = useCallback((msg: string, type: ToastType = 'success') => {
    const id = ++idRef.current
    setToasts(p => [...p, { id, msg, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
  }, [])
  const remove = useCallback((id: number) => setToasts(p => p.filter(t => t.id !== id)), [])
  return { toasts, push, remove }
}

// ─── Sprint task card ─────────────────────────────────────────────────────────
function SprintTaskCard({
  task, onTaskClick, isDragging,
}: {
  task: Task; onTaskClick: (t: Task) => void; isDragging?: boolean
}) {
  const tid = task.id
  return (
    <div
      onClick={() => onTaskClick(task)}
      className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md hover:border-blue-300 transition-all cursor-pointer group select-none ${isDragging ? 'opacity-50 rotate-1' : ''}`}
    >
      <div className="flex items-start justify-between gap-1 mb-1.5">
        <span className="text-[10px] font-mono text-gray-400">{tid}</span>
        <PriBadge p={task.priority} />
      </div>
      <p className="text-sm text-gray-900 font-medium leading-snug mb-2.5 line-clamp-2">{task.title}</p>
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1 text-[11px] text-gray-400">
          <Check className="w-3 h-3" />{task.points ?? 1} pts
        </span>
        <Av name={task.assignee} size={6} />
      </div>
    </div>
  )
}

// ─── Kanban column ────────────────────────────────────────────────────────────
function KanbanCol({
  title, colorDot, tasks, onTaskClick, onMove, onAddTask, prefix, toast,
}: {
  title: string; colorDot: string; tasks: Task[]
  onTaskClick: (t: Task) => void; onMove: (id: string, status: CardStatus) => void
  onAddTask?: () => void; prefix?: string; toast: (m: string, t?: ToastType) => void
}) {
  const [over, setOver] = useState(false)

  const statusMap: Record<string, CardStatus> = {
    'To Do': 'todo', 'In Progress': 'inprogress', 'Done': 'done',
  }
  const colStatus = statusMap[title]

  return (
    <div
      className={`flex flex-col rounded-xl border-2 transition-all min-h-[300px] ${over ? 'border-blue-400 bg-blue-50/40 shadow-md' : 'border-gray-200 bg-gray-50/60'}`}
      onDragOver={e => { e.preventDefault(); setOver(true) }}
      onDragEnter={e => { e.preventDefault(); setOver(true) }}
      onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setOver(false) }}
      onDrop={e => {
        e.preventDefault(); setOver(false)
        if (_dragTaskId !== null) {
          onMove(_dragTaskId, colStatus)
          if (_dragTaskTitle) toast(`ย้าย "${_dragTaskTitle}" → ${title}`, 'info')
          _dragTaskId = null; _dragTaskTitle = null
        }
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-200/70">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${colorDot}`} />
          <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">{title}</span>
          <span className="bg-gray-200 text-gray-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{tasks.length}</span>
        </div>
        <button className="p-1 rounded hover:bg-gray-200 text-gray-400 transition-colors">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Drop indicator */}
      {over && (
        <div className="mx-2 mt-2 h-1.5 bg-blue-400 rounded-full animate-pulse" />
      )}

      {/* Cards */}
      <div className="flex-1 p-2 space-y-2">
        {tasks.length === 0 && !over && (
          <div className="py-8 text-center text-gray-300 text-xs select-none">
            {title === 'In Progress' ? 'Add tasks here to start working' : 'No tasks'}
          </div>
        )}
        {tasks.map(task => (
          <div
            key={task.id}
            draggable
            onDragStart={e => {
              _dragTaskId = task.id
              _dragTaskTitle = task.title ?? null
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => { _dragTaskId = null; _dragTaskTitle = null }}
          >
            <SprintTaskCard task={task} onTaskClick={onTaskClick} />
          </div>
        ))}
      </div>

      {/* Add task */}
      {onAddTask && (
        <button
          onClick={onAddTask}
          className="flex items-center gap-1.5 px-3 py-2.5 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors rounded-b-xl border-t border-gray-200/70"
        >
          <Plus className="w-3.5 h-3.5" /> Add Task
        </button>
      )}
    </div>
  )
}

// ─── Create Sprint Modal ──────────────────────────────────────────────────────
function CreateSprintModal({ num, onClose, onCreate }: {
  num: number
  onClose: () => void
  onCreate: (d: Omit<Sprint, 'id' | 'status' | 'taskIds' | 'projectId'>) => void
}) {
  const today = new Date().toISOString().split('T')[0]
  const [form, setForm] = useState({
    name: `Sprint ${num}`, goal: '',
    startDate: today,
    endDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    duration: '2 weeks', capacity: '40h', label: 'Regular Sprint',
  })
  const f = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(p => ({ ...p, [k]: e.target.value }))

  const mouseDownTarget = useRef<EventTarget | null>(null)

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
      onMouseDown={(e) => { mouseDownTarget.current = e.target }}
      onClick={(e) => {
        if (mouseDownTarget.current === e.currentTarget) {
          onClose()
        }
      }}
    >
      <div className="bg-white rounded-2xl w-full max-w-3xl mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Create Sprint</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl">×</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[['Sprint Name', 'name', 'text'], ['Sprint Goal', 'goal', 'text']].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                <input value={(form as any)[key]} onChange={f(key)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[['Start Date', 'startDate'], ['End Date', 'endDate']].map(([label, key]) => (
              <div key={key}>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                <input type="date" value={(form as any)[key]} onChange={f(key)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sprint Duration</label>
              <select value={form.duration} onChange={f('duration')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                {['1 week','2 weeks','10 days','3 weeks','4 weeks'].map(d => <option key={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sprint Capacity</label>
              <input value={form.capacity} onChange={f('capacity')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sprint Label <span className="font-normal text-gray-400">(optional)</span></label>
            <input value={form.label} onChange={f('label')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={() => onCreate(form)}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm">Create</button>
        </div>
      </div>
    </div>
  )
}

// ─── Add Tasks from Backlog Modal ─────────────────────────────────────────────
function AddBacklogModal({ tasks, sprint, onClose, onAdd }: {
  tasks: Task[]; sprint: Sprint; onClose: () => void; onAdd: (ids: string[]) => void
}) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const list = tasks.filter(t => !search || t.title?.toLowerCase().includes(search.toLowerCase()))
  const allSel = list.length > 0 && list.every(t => selected.has(t.id))

  const toggleAll = () => {
    if (allSel) setSelected(new Set())
    else setSelected(new Set(list.map(t => t.id)))
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-2xl mx-4 shadow-2xl flex flex-col max-h-[85vh]" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Add Tasks from Backlog</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              เลือก task สำหรับ {sprint.name} ({fmtDate(sprint.startDate)} – {fmtDate(sprint.endDate)})
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 text-xl">×</button>
        </div>

        <div className="px-6 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks..."
              className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-[32px_1fr_80px_130px] px-6 py-2 bg-gray-50 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center">
            <input type="checkbox" checked={allSel} onChange={toggleAll} className="w-4 h-4 accent-blue-600 rounded cursor-pointer" />
          </div>
          {['Task', 'Priority', 'Assignee'].map(h => (
            <div key={h} className="text-xs font-semibold text-gray-400 uppercase tracking-wide py-1">{h}</div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto">
          {list.length === 0 && (
            <div className="py-12 text-center text-gray-400 text-sm">
              <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />ไม่มี task ใน backlog
            </div>
          )}
          {list.map(task => {
            const isSel = selected.has(task.id)
            const tid = task.id
            return (
              <div key={task.id} onClick={() => setSelected(p => { const n = new Set(p); if (n.has(task.id)) n.delete(task.id); else n.add(task.id); return n })}
                className={`grid grid-cols-[32px_1fr_80px_130px] px-6 py-3 border-b border-gray-50 hover:bg-blue-50/40 cursor-pointer transition-colors ${isSel ? 'bg-blue-50' : ''}`}>
                <div className="flex items-center">
                  <input type="checkbox" checked={isSel} onChange={() => {}} className="w-4 h-4 accent-blue-600 rounded" />
                </div>
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <span className="text-xs font-mono text-gray-400 flex-shrink-0">{tid}</span>
                  <span className="text-sm text-gray-900 font-medium truncate">{task.title}</span>
                </div>
                <div className="flex items-center"><PriBadge p={task.priority} /></div>
                <div className="flex items-center gap-1.5"><Av name={task.assignee} size={5} /><span className="text-xs text-gray-600 truncate">{task.assignee ?? '—'}</span></div>
              </div>
            )
          })}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between flex-shrink-0">
          <span className="text-sm text-gray-500">{selected.size} ของ {list.length} รายการที่เลือก</span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={() => onAdd(Array.from(selected))} disabled={selected.size === 0}
              className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed">
              Add to Sprint ({selected.size})
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Complete Sprint Confirm Modal ─────────────────────────────────────────────
function CompleteSprintModal({ sprint, tasks, sprints, onClose, onConfirm }: {
  sprint: Sprint; tasks: Task[]; sprints: Sprint[]; onClose: () => void; onConfirm: (action: 'backlog' | 'next_sprint', nextSprintId?: string) => void
}) {
  const sprintTasks = tasks.filter(t => sprint.taskIds.includes(t.id))
  const done = sprintTasks.filter(t => t.status === 'done')
  const notDone = sprintTasks.filter(t => t.status !== 'done')
  
  const [action, setAction] = useState<'backlog' | 'next_sprint'>('backlog')
  // This filter runs on every render, so it always has the latest sprints
  const plannedSprints = sprints.filter(s => s.status === 'planned' && s.id !== sprint.id)
  const [nextSprintId, setNextSprintId] = useState<string>('')

  useEffect(() => {
    // If plannedSprints change (e.g. user created a new sprint),
    // ensure nextSprintId is valid. If not set or invalid, default to first available.
    if (plannedSprints.length > 0) {
      // If we don't have a valid selection yet, pick the first one
      const currentValid = plannedSprints.some(s => s.id === nextSprintId)
      if (!nextSprintId || !currentValid) {
        setNextSprintId(plannedSprints[0].id)
      }
    } else {
      // No planned sprints available
      if (nextSprintId) setNextSprintId('')
      if (action === 'next_sprint') setAction('backlog')
    }
  }, [plannedSprints, nextSprintId, action])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">
            Complete &quot;{sprint.name}&quot;?
          </h2>
          <p className="text-sm text-gray-500 mt-1">สรุปผลก่อน Complete Sprint</p>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
            <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
            <div>
              <div className="text-sm font-semibold text-green-800">Completed: {done.length} tasks</div>
              <div className="text-xs text-green-600 mt-0.5">{done.slice(0,3).map(t=>t.title).join(', ')}{done.length > 3 ? ` +${done.length-3} more` : ''}</div>
            </div>
          </div>
          
          {notDone.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl border border-yellow-100">
                <Clock className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                <div>
                  <div className="text-sm font-semibold text-yellow-800">Incomplete: {notDone.length} tasks</div>
                  <div className="text-xs text-yellow-600 mt-0.5">เลือกดำเนินการกับ Tasks ที่ยังไม่เสร็จ</div>
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="incompleteAction" 
                    checked={action === 'backlog'} 
                    onChange={() => setAction('backlog')}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">ย้ายไปที่ Backlog</span>
                </label>
                
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="incompleteAction" 
                    checked={action === 'next_sprint'} 
                    onChange={() => setAction('next_sprint')}
                    disabled={plannedSprints.length === 0}
                    className="text-blue-600 focus:ring-blue-500 disabled:opacity-50"
                  />
                  <span className={`text-sm ${plannedSprints.length === 0 ? 'text-gray-400' : 'text-gray-700'}`}>
                    ย้ายไป Sprint ถัดไป {plannedSprints.length === 0 && '(ไม่มี Sprint ถัดไป)'}
                  </span>
                </label>
                
                {action === 'next_sprint' && plannedSprints.length > 0 && (
                  <select 
                    value={nextSprintId}
                    onChange={(e) => setNextSprintId(e.target.value)}
                    className="ml-6 mt-1 block w-[calc(100%-1.5rem)] rounded-md border-gray-300 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm bg-white border px-2"
                  >
                    {plannedSprints.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
          <button 
            onClick={() => onConfirm(action, nextSprintId)} 
            className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 shadow-sm"
          >
            ✓ Complete Sprint
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Delete Sprint Confirm Modal ──────────────────────────────────────────────
function DeleteSprintModal({ sprint, onClose, onConfirm }: {
  sprint: Sprint; onClose: () => void; onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">ลบ Sprint นี้?</h2>
          <p className="text-sm text-gray-500 mt-1">
            ลบ &quot;{sprint.name}&quot; ? Task ทั้งหมดใน Sprint นี้จะกลับไปที่ Backlog
          </p>
        </div>
        <div className="px-6 py-4 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            ยกเลิก
          </button>
          <button
            onClick={onConfirm}
            className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 shadow-sm"
          >
            ลบ Sprint
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Completed Sprint Detail View ─────────────────────────────────────────────
function CompletedSprintDetail({ sprint, onBack }: { sprint: Sprint; onBack: () => void }) {
  const snapshots = sprint.taskSnapshots ?? []
  const done = snapshots.filter(t => t.status === 'done')
  const notDone = snapshots.filter(t => t.status !== 'done')
  const completePct = snapshots.length > 0 ? Math.round((done.length / snapshots.length) * 100) : 0

  return (
    <div className="flex-1 overflow-y-auto bg-gray-50 p-6">
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-600 mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> กลับ
      </button>

      {/* Header card */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{sprint.name}</h2>
              <span className="px-2.5 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">Completed</span>
            </div>
            {sprint.goal && <p className="text-sm text-gray-500 mb-1">Goal: {sprint.goal}</p>}
            <div className="flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{fmtDate(sprint.startDate)} – {fmtDate(sprint.endDate)}</span>
              {sprint.completedAt && <span>Completed: {fmtDate(sprint.completedAt)}</span>}
              {sprint.label && <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded">{sprint.label}</span>}
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-blue-600">{completePct}%</div>
            <div className="text-xs text-gray-400 mt-0.5">completion rate</div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-green-400 to-green-600 rounded-full transition-all" style={{ width: `${completePct}%` }} />
        </div>

        {/* Summary stats */}
        <div className="grid grid-cols-3 gap-4 mt-4">
          {[
            { label: 'Total Tasks', value: snapshots.length, bg: 'bg-blue-50', c: 'text-blue-700' },
            { label: 'Completed', value: done.length, bg: 'bg-green-50', c: 'text-green-700' },
            { label: 'Incomplete', value: notDone.length, bg: 'bg-yellow-50', c: 'text-yellow-700' },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-lg p-3 text-center`}>
              <div className={`text-2xl font-bold ${s.c}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Task list */}
      {snapshots.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-gray-400">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p className="text-sm">ไม่มีข้อมูล task ใน sprint นี้</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700">รายการ Tasks ใน Sprint</h3>
          </div>
          <div className="divide-y divide-gray-50">
            {snapshots.map(t => {
              const tid = t.id
              return (
                <div key={t.id} className="grid grid-cols-[auto_1fr_80px_80px_80px] gap-3 items-center px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${t.status === 'done' ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
                    {t.status === 'done' && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
                  </div>
                  <div>
                    <span className="text-xs font-mono text-gray-400 mr-2">{tid}</span>
                    <span className={`text-sm font-medium ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>{t.title}</span>
                  </div>
                  <PriBadge p={t.priority} />
                  <StatusBadge s={t.status} />
                  <div className="flex items-center gap-1.5"><Av name={t.assignee} size={5} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sprint selector dropdown ─────────────────────────────────────────────────
function SprintSelector({ sprints, current, onChange }: {
  sprints: Sprint[]; current: Sprint | null; onChange: (s: Sprint) => void
}) {
  const [open, setOpen] = useState(false)
  if (sprints.length <= 1) return null
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
      >
        {current?.name ?? 'Select Sprint'}
        <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-30 min-w-[200px] py-1 overflow-hidden">
          {sprints.map(s => (
            <button
              key={s.id}
              onClick={() => { onChange(s); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center justify-between gap-3 ${s.id === current?.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700'}`}
            >
              <span>{s.name}</span>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                {s.status === 'active' ? 'Active' : s.status === 'completed' ? 'Done' : 'Planned'}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main SprintBoard ─────────────────────────────────────────────────────────
interface SprintBoardProps {
  tasks: Task[]
  projectId: number
  onTaskClick: (task: Task) => void
  onTaskStatusChange: (taskId: string, newStatus: CardStatus) => void
  onCreateTask: () => void
  readOnly?: boolean
}

export default function SprintBoard({
  tasks,
  projectId,
  onTaskClick,
  onTaskStatusChange,
  onCreateTask,
  readOnly = false,
}: SprintBoardProps) {
  const { user } = useAuth()
  const effectiveReadOnly = readOnly || user?.role === 'guest'
  const [sprints, setSprints] = useState<Sprint[]>([])
  const [viewingSprint, setViewingSprint] = useState<Sprint | null>(null)
  const [viewingCompleted, setViewingCompleted] = useState<Sprint | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [showAddBacklog, setShowAddBacklog] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<Sprint | null>(null)
  const { toasts, push: toast, remove } = useToast()

  const prevTaskIdsRef = useRef<Set<string>>(new Set())
  // Refs that always hold latest values — safe to read inside effects
  const viewingSprintRef = useRef<Sprint | null>(null)
  const sprintsRef = useRef<Sprint[]>([])

  // Keep refs in sync
  useEffect(() => { viewingSprintRef.current = viewingSprint }, [viewingSprint])
  useEffect(() => { sprintsRef.current = sprints }, [sprints])

  useEffect(() => {
    let cancelled = false

    // 1) โหลดจาก localStorage ให้แสดงทันที
    const local = loadSprints(projectId)
    sprintsRef.current = local
    setSprints(local)
    const firstLocal =
      local.find(s => s.status === 'active') ??
      local.find(s => s.status === 'planned') ??
      null
    viewingSprintRef.current = firstLocal
    setViewingSprint(firstLocal)
    prevTaskIdsRef.current = new Set(tasks.map(t => t.id))

    // 2) ดึงจาก Supabase แล้ว sync ทับภายหลัง (background)
    const syncFromSupabase = async () => {
      try {
        const remote = await sprintService.getSprints(projectId)
        const mappedRemote: Sprint[] = remote.map(r => ({
          id: r.id,
          name: r.name,
          goal: r.goal ?? '',
          startDate: r.startDate,
          endDate: r.endDate,
          duration: r.duration ?? '2 weeks',
          capacity: r.capacity ?? '',
          label: r.label ?? '',
          status: r.status,
          taskIds: [],
          projectId: r.projectId,
          completedAt: r.completedAt ?? undefined,
          actualEndDate: r.actualEndDate ?? null,
        }))
        const latestLocal = loadSprints(projectId)
        const byId = new Map(latestLocal.map(s => [s.id, s]))
        const byName = new Map(latestLocal.map(s => [s.name, s])) // Fallback match by name
        
        // Track which local sprints have been "merged" into remote ones
        const mergedLocalIds = new Set<string>()

        let merged: Sprint[] = mappedRemote.map(base => {
          // 1. Try exact ID match
          let localSprint = byId.get(base.id)
          
          // 2. If no ID match, try Name match (if local is temp ID)
          if (!localSprint) {
             const potentialMatch = byName.get(base.name)
             // Only merge if the name matches AND the local one has a temp ID (starts with sprint_)
             // This prevents merging "Sprint 1" (ID: 1) with "Sprint 1" (ID: 2) if both are from DB?
             // But here we assume local might have temp ID.
             if (potentialMatch && potentialMatch.id.startsWith('sprint_')) {
                 localSprint = potentialMatch
             }
          }

          if (!localSprint) return base

          mergedLocalIds.add(localSprint.id)

          return {
            ...base,
            taskIds: localSprint.taskIds ?? [],
            taskSnapshots: localSprint.taskSnapshots,
          }
        })

        // Add local sprints that were NOT merged (and are not duplicates by name either?)
        // If we have a local sprint "Sprint X" that wasn't matched to any remote sprint, we keep it.
        // But if we already have a remote "Sprint X", we should have matched it above?
        // Yes, if names are identical, it would be matched by `byName` logic above.
        // So `merged` already contains it (with remote ID).
        // So we only add local sprints that truly don't exist in remote.

        for (const s of latestLocal) {
          if (!mergedLocalIds.has(s.id)) {
            // Double check if this local sprint is already represented in merged by ID (unlikely if not in set)
            // or by Name (if we missed it somehow).
            // But logic above iterates ALL remote sprints.
            // So if a remote sprint existed with same name, we would have used it.
            // So this `s` is truly new/local-only.
            // EXCEPT: What if remote has "Sprint 4" (Active) and local has "Sprint 4" (Done)?
            // If names match, we used the local data into the remote shell?
            // Wait, if remote is "Sprint 4" and local is "Sprint 4", we merged them.
            // But `base` properties (status) come from REMOTE.
            // So if remote is Active, merged result is Active.
            // Local might be Done. We lose the "Done" status from local?
            // Yes, Remote is truth for status.
            
            // However, what if we have multiple local sprints with same name? `byName` map only keeps one.
            // That's an edge case we accept for now.
            
            // Check if ID is already in merged (e.g. if local ID was same as remote ID)
            if (!merged.some(m => m.id === s.id)) {
               // Only preserve local sprints that have a temporary ID (starts with 'sprint_')
               // This assumes they are newly created and not yet synced to Supabase.
               // Sprints with other IDs (UUIDs) that are missing from remote are considered DELETED.
               if (s.id.startsWith('sprint_')) {
                 merged.push(s)
               }
            }
          }
        }
        
        // Sort sprints by startDate then name (natural sort)
         merged.sort((a, b) => {
           // 1. By Start Date
           const dateA = new Date(a.startDate).getTime()
           const dateB = new Date(b.startDate).getTime()
           if (dateA !== dateB) return dateA - dateB
           
           // 2. By Name (natural sort: Sprint 2 < Sprint 10)
           return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' })
         })
         
         // Save the deduplicated/merged list back to localStorage to fix the IDs
         saveSprints(projectId, merged)

        if (cancelled) return

        sprintsRef.current = merged
        setSprints(merged)
        
        // Restore view if possible
        const currentViewId = viewingSprintRef.current?.id
        // If current view was a temp ID that got merged into a remote ID, we need to find it by name?
        // Or just pick a default.
        
        // Try to find the currently viewed sprint in the new merged list
        let nextView: Sprint | null = merged.find(s => s.id === currentViewId) ?? null
        
        // If not found (maybe ID changed due to merge), try to find by name of the previous view
        if (!nextView && viewingSprintRef.current) {
            nextView = merged.find(s => s.name === viewingSprintRef.current?.name) ?? null
        }
        
        // If still not found, default to Active -> Planned
        if (!nextView) {
            nextView = merged.find(s => s.status === 'active') ??
                       merged.find(s => s.status === 'planned') ??
                       null
        }
        
        viewingSprintRef.current = nextView
        setViewingSprint(nextView)
      } catch {
      }

      if (cancelled) return

      try {
        const toastKey = `sprint_last_toast_${projectId}`
        const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(toastKey)
        if (raw) {
          const parsed = JSON.parse(raw) as { msg?: string; type?: ToastType }
          if (parsed?.msg) {
            toast(parsed.msg, parsed.type ?? 'success')
          }
          window.localStorage.removeItem(toastKey)
        }
      } catch {
      }
    }

    void syncFromSupabase()

    return () => {
      cancelled = true
    }
  }, [projectId])

  // Auto-add newly created tasks to the currently viewed sprint
  useEffect(() => {
    const prevIds = prevTaskIdsRef.current
    const newTasks = tasks.filter(t => {
      const belongsToProject = t.projectId === projectId
      const isInDependency = Array.isArray(t.teamDependencyIds) && t.teamDependencyIds.includes(projectId)
      return (belongsToProject || isInDependency) && !prevIds.has(t.id)
    })
    prevTaskIdsRef.current = new Set(tasks.map(t => t.id))
    if (newTasks.length === 0) return

    // Read latest sprints from ref — avoids stale closure
    const currentSprints = sprintsRef.current
    const viewedId = viewingSprintRef.current?.id

    // Pick target sprint: viewed → active → planned
    const target =
      currentSprints.find(s => s.id === viewedId && s.status !== 'completed') ??
      currentSprints.find(s => s.status === 'active') ??
      currentSprints.find(s => s.status === 'planned')

    if (!target) return

    const newIds = newTasks.map(t => t.id).filter(id => !target.taskIds.includes(id))
    if (newIds.length === 0) return

    // Build updated sprint + sprints list
    const updatedSprint: Sprint = { ...target, taskIds: [...target.taskIds, ...newIds] }
    const updatedSprints = currentSprints.map(s => s.id === target.id ? updatedSprint : s)

    // Persist to localStorage
    saveSprints(projectId, updatedSprints)

    // Update React state directly (no updater — avoids calling setState inside setState)
    sprintsRef.current = updatedSprints
    setSprints(updatedSprints)

    // Sync viewingSprint if the target is currently being viewed
    if (viewingSprintRef.current?.id === target.id) {
      viewingSprintRef.current = updatedSprint
      setViewingSprint(updatedSprint)
    }

    toast(`✓ เพิ่ม ${newIds.length} task เข้า ${target.name} เรียบร้อย`, 'success')
  }, [tasks])

  const persist = (updated: Sprint[]) => {
    setSprints(updated)
    saveSprints(projectId, updated)
    // Keep viewingSprint in sync
    if (viewingSprint) {
      const synced = updated.find(s => s.id === viewingSprint.id)
      if (synced) setViewingSprint(synced)
    }
  }

  const activeSprint = sprints.find(s => s.status === 'active') ?? null
  const completedSprints = sprints.filter(s => s.status === 'completed')
  const currentView = viewingSprint ?? activeSprint

  // Backlog = tasks not in any ACTIVE or PLANNED sprint
  // (completed sprint tasks that weren't done are returned to backlog)
  const activeSprintTaskIds = new Set(
    sprints.filter(s => s.status !== 'completed').flatMap(s => s.taskIds)
  )
  const backlogTasks = tasks.filter(t => {
    const belongsToProject = t.projectId === projectId
    const isInDependency = Array.isArray(t.teamDependencyIds) && t.teamDependencyIds.includes(projectId)
    return (belongsToProject || isInDependency) && !activeSprintTaskIds.has(t.id) && t.status !== 'done'
  })

  // Sprint tasks
  const sprintTasks = currentView ? tasks.filter(t => currentView.taskIds.includes(t.id)) : []
  const todoTasks = sprintTasks.filter(t => t.status === 'todo')
  const inProgressTasks = sprintTasks.filter(t => t.status === 'inprogress')
  const doneTasks = sprintTasks.filter(t => t.status === 'done')
  const progressPct = sprintTasks.length > 0 ? Math.round((doneTasks.length / sprintTasks.length) * 100) : 0

  const members = Array.from(new Set(sprintTasks.map(t => t.assignee).filter(Boolean))) as string[]

  // ── Handlers ──
  const handleCreate = async (data: Omit<Sprint, 'id' | 'status' | 'taskIds' | 'projectId'>) => {
    if (effectiveReadOnly) {
      toast('Guest ดูอย่างเดียว สร้าง Sprint ไม่ได้', 'error')
      return
    }
    const sprint: Sprint = { ...data, id: `sprint_${Date.now()}`, status: activeSprint ? 'planned' : 'active', taskIds: [], projectId }
    const updated = [...sprints, sprint]
    persist(updated)
    setViewingSprint(sprint)
    setShowCreate(false)
    toast(`✓ สร้าง "${sprint.name}" เรียบร้อยแล้ว${activeSprint ? ' (Planned)' : ' (Active)'}`, 'success')
    try {
      const createdSprint = await sprintService.createSprint({
        projectId,
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
        duration: sprint.duration,
        capacity: sprint.capacity,
        label: sprint.label,
        status: sprint.status,
        completedAt: sprint.completedAt ?? null,
      })

      // Update local sprint ID with real ID from server
      const updatedWithRealId = sprintsRef.current.map(s => 
        s.id === sprint.id ? { ...s, id: createdSprint.id } : s
      )
      persist(updatedWithRealId)
      
      // If we are currently viewing the temp sprint, update the view state too
      if (viewingSprint?.id === sprint.id) {
         const newView = { ...sprint, id: createdSprint.id }
         setViewingSprint(newView)
         viewingSprintRef.current = newView
      }
    } catch (e: any) {
      console.error('Create sprint failed:', e)
      toast(`สร้าง Sprint ไม่สำเร็จ: ${e.message}`, 'error')
      // Revert from local state
      const reverted = sprintsRef.current.filter(s => s.id !== sprint.id)
      persist(reverted)
      if (viewingSprint?.id === sprint.id) {
         setViewingSprint(null)
         viewingSprintRef.current = null
      }
    }
  }

  const handleAddTasks = (ids: string[]) => {
    if (effectiveReadOnly) {
      toast('Guest ดูอย่างเดียว แก้ไข Sprint ไม่ได้', 'error')
      return
    }
    if (!currentView) return
    const updated = sprints.map(s =>
      s.id === currentView.id ? { ...s, taskIds: Array.from(new Set([...s.taskIds, ...ids])) } : s
    )
    persist(updated)
    setShowAddBacklog(false)
    toast(`✓ เพิ่ม ${ids.length} task ลงใน ${currentView.name}`, 'success')
  }

  const handleCompleteSprint = async (action: 'backlog' | 'next_sprint', nextSprintId?: string) => {
    if (effectiveReadOnly) {
      toast('Guest ดูอย่างเดียว ปิด Sprint ไม่ได้', 'error')
      return
    }
    if (!currentView) return
    const snapshots = sprintTasks.map(t => ({ id: t.id, title: t.title, status: t.status, priority: t.priority, assignee: t.assignee, points: t.points }))
    const doneTaskIds = doneTasks.map(t => t.id)
    const notDoneTaskIds = sprintTasks.filter(t => t.status !== 'done').map(t => t.id)

    const updated = sprints.map(s => {
      // 1. Complete the current sprint
      if (s.id === currentView.id) {
        return { 
          ...s, 
          status: 'completed' as const, 
          completedAt: new Date().toISOString(), 
          taskSnapshots: snapshots, 
          taskIds: doneTaskIds // Only keep done tasks in the completed sprint
        }
      }
      
      // 2. Activate next sprint if available
      // If user selected "next_sprint", move tasks there.
      // If user selected "backlog", we still might want to activate the next planned sprint?
      // The requirement is "Complete Sprint แล้วให้ปรับให้sprintต่อไปactive".
      // So if nextSprintId is provided (it defaults to first planned sprint), we activate it.
      if (nextSprintId && s.id === nextSprintId) {
        let newIds = s.taskIds
        if (action === 'next_sprint') {
          // Add incomplete tasks to next sprint, avoiding duplicates
          newIds = Array.from(new Set([...s.taskIds, ...notDoneTaskIds]))
        }
        return { ...s, taskIds: newIds, status: 'active' as const }
      }
      
      return s
    })

    persist(updated)
    setShowCompleteModal(false)
    
    let message = `🎉 "${currentView.name}" เสร็จสมบูรณ์! Completed ${doneTasks.length}/${sprintTasks.length} tasks`
    if (notDoneTaskIds.length > 0) {
      if (action === 'next_sprint' && nextSprintId) {
        const targetSprint = sprints.find(s => s.id === nextSprintId)
        message += `. Moved ${notDoneTaskIds.length} tasks to ${targetSprint?.name ?? 'next sprint'}.`
      } else {
        message += `. ${notDoneTaskIds.length} tasks returned to backlog.`
      }
    }
    
    const activatedSprint = updated.find(s => s.id === nextSprintId)
    if (activatedSprint && activatedSprint.status === 'active') {
       message += ` Started "${activatedSprint.name}".`
    }

    toast(message, 'success')

    const completed = updated.find(s => s.id === currentView.id)!
    setViewingCompleted(completed)
    // If we activated a new sprint, switch view to it
    if (nextSprintId) {
        const nextActive = updated.find(s => s.id === nextSprintId)
        if (nextActive) {
            setViewingSprint(nextActive)
            viewingSprintRef.current = nextActive
        } else {
            setViewingSprint(null)
        }
    } else {
        setViewingSprint(null)
    }

    try {
      await sprintService.updateSprint(currentView.id, {
        status: 'completed',
        completedAt: completed.completedAt ?? null,
        actualEndDate: new Date().toISOString(),
      })
      
      if (nextSprintId) {
        await sprintService.updateSprint(nextSprintId, { status: 'active' })
      }
    } catch {
    }
  }

  const handleDeleteSprint = async (sprintId: string) => {
    if (effectiveReadOnly) {
      toast('Guest ดูอย่างเดียว ลบ Sprint ไม่ได้', 'error')
      return
    }
    const sprint = sprints.find(s => s.id === sprintId)
    if (!sprint) return
    
    // Optimistic update
    const previousSprints = [...sprints]
    const previousViewingSprint = viewingSprint

    const updated = sprints.filter(s => s.id !== sprintId)
    persist(updated)
    // If we were viewing this sprint, switch to next available
    if (viewingSprint?.id === sprintId) {
      const next = updated.find(s => s.status === 'active') ?? updated.find(s => s.status === 'planned') ?? null
      setViewingSprint(next)
      viewingSprintRef.current = next
    }
    
    toast(`กำลังลบ "${sprint.name}"...`, 'info')
    
    try {
      // 1. Unassign tasks from this sprint in DB (to prevent FK violations)
      if (sprint.taskIds && sprint.taskIds.length > 0) {
        await Promise.all(sprint.taskIds.map(tid => 
          taskService.updateTask(tid, { sprintId: null }).catch(() => {})
        ))
      }

      // 2. Delete sprint
      await sprintService.deleteSprint(sprintId)
      toast(`ลบ "${sprint.name}" เรียบร้อยแล้ว`, 'success')
    } catch (e: any) {
      console.error('Delete sprint failed:', e)
      toast(`ลบไม่สำเร็จ: ${e.message || 'Unknown error'}`, 'error')
      
      // Revert state if failed
      persist(previousSprints)
      if (previousViewingSprint?.id === sprintId) {
        setViewingSprint(previousViewingSprint)
        viewingSprintRef.current = previousViewingSprint
      }
    }
  }

  const handleMove = (taskId: string, newStatus: CardStatus) => {
    onTaskStatusChange(taskId, newStatus)
  }

  // ── Completed detail view ──
  if (viewingCompleted) {
    return (
      <>
        <CompletedSprintDetail sprint={viewingCompleted} onBack={() => setViewingCompleted(null)} />
        <ToastContainer toasts={toasts} remove={remove} />
      </>
    )
  }

  // ── Empty state ──
  if (sprints.length === 0) {
    return (
      <>
        <div className="flex-1 overflow-y-auto">
          <div className="flex flex-col items-center justify-center py-16 px-6">
            <div className="w-52 h-36 mb-6">
              <svg viewBox="0 0 260 180" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="20" y="30" width="65" height="100" rx="10" fill="#e0e7ff" stroke="#6366f1" strokeWidth="1.5"/>
                <rect x="97" y="18" width="65" height="112" rx="10" fill="#dbeafe" stroke="#3b82f6" strokeWidth="1.5"/>
                <rect x="174" y="40" width="65" height="90" rx="10" fill="#dcfce7" stroke="#22c55e" strokeWidth="1.5"/>
                <rect x="32" y="50" width="42" height="7" rx="3.5" fill="#a5b4fc"/>
                <rect x="32" y="64" width="34" height="7" rx="3.5" fill="#c7d2fe"/>
                <rect x="32" y="78" width="38" height="7" rx="3.5" fill="#c7d2fe"/>
                <rect x="109" y="36" width="42" height="7" rx="3.5" fill="#93c5fd"/>
                <rect x="109" y="50" width="30" height="7" rx="3.5" fill="#bfdbfe"/>
                <rect x="109" y="64" width="36" height="7" rx="3.5" fill="#bfdbfe"/>
                <rect x="186" y="58" width="42" height="7" rx="3.5" fill="#86efac"/>
                <rect x="186" y="72" width="30" height="7" rx="3.5" fill="#bbf7d0"/>
              </svg>
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">No Sprint Yet</h3>
            <p className="text-gray-400 text-sm text-center max-w-sm mb-6">สร้าง Sprint แรกเพื่อเริ่มจัดการ task จาก Backlog</p>
            <button
              onClick={effectiveReadOnly ? undefined : () => setShowCreate(true)}
              disabled={effectiveReadOnly}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed">
              <Plus className="w-4 h-4" /> Create Sprint
            </button>
            <div className="mt-8 flex items-center gap-3 text-xs text-gray-400">
              {['Create Sprint','Add Tasks from Backlog','Start Working!'].map((s, i) => (
                <div key={s} className="flex items-center gap-3">
                  {i > 0 && <ChevronRight className="w-3 h-3" />}
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-blue-100 text-blue-600 text-[10px] font-bold flex items-center justify-center">{i+1}</div>
                    <span>{s}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="px-6 pb-6 grid grid-cols-2 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><Zap className="w-4 h-4 text-amber-500" /><span className="text-xs font-bold text-amber-700">Quick Tips</span></div>
              <ul className="space-y-1 text-xs text-amber-700">
                <li>• ไปที่ <strong>Backlog</strong> เพื่อสร้าง task</li>
                <li>• <strong>Create Sprint</strong> แล้วเลือก task จาก backlog</li>
              </ul>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2"><BookOpen className="w-4 h-4 text-blue-500" /><span className="text-xs font-bold text-blue-700">Kanban Guide</span></div>
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <span className="px-1.5 py-0.5 bg-gray-200 text-gray-600 rounded text-[10px] font-medium">To Do</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 bg-yellow-200 text-yellow-700 rounded text-[10px] font-medium">In Progress</span>
                <span>→</span>
                <span className="px-1.5 py-0.5 bg-green-200 text-green-700 rounded text-[10px] font-medium">Done</span>
              </div>
            </div>
          </div>
        </div>

        {showCreate && <CreateSprintModal num={1} onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
        <ToastContainer toasts={toasts} remove={remove} />
      </>
    )
  }

  // ── Sprint view ──
  return (
    <>
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* ── Top bar ── */}
        <div className="bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              {/* Sprint selector + name */}
              <div className="flex items-center gap-3 flex-wrap mb-1">
                <SprintSelector sprints={sprints} current={currentView} onChange={s => {
                  setViewingSprint(s)
                  setViewingCompleted(null)
                }} />
                {currentView && (
                  <>
                    <div className="flex items-center gap-1 text-xs text-gray-400 bg-gray-100 rounded px-2 py-0.5">
                      <Calendar className="w-3 h-3" />
                      {fmtDate(currentView.startDate)} – {fmtDate(currentView.endDate)}
                    </div>
                    <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full ${currentView.status === 'active' ? 'bg-green-100 text-green-700' : currentView.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                      {currentView.status === 'active' ? 'Active' : currentView.status === 'completed' ? 'Completed' : 'Planned'}
                    </span>
                  </>
                )}
              </div>
              {currentView?.goal && (
                <p className="text-xs text-gray-400"><span className="font-medium text-gray-600">Goal:</span> {currentView.goal}</p>
              )}
              {currentView?.status !== 'completed' && (
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-xs text-gray-500">{sprintTasks.length} tasks · {progressPct}% done</span>
                  <div className="flex-1 max-w-[180px] h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 ml-4 flex-shrink-0">
              {currentView?.status === 'completed' ? (
                <button onClick={() => setViewingCompleted(currentView)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors">
                  <Eye className="w-3.5 h-3.5" /> ดูรายละเอียด
                </button>
              ) : (
                <>
                  <button
                    onClick={effectiveReadOnly ? undefined : onCreateTask}
                    disabled={effectiveReadOnly}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-3.5 h-3.5" /> Add Task
                  </button>
                  <button
                    onClick={effectiveReadOnly ? undefined : () => setShowAddBacklog(true)}
                    disabled={effectiveReadOnly}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 bg-white rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    <BookOpen className="w-3.5 h-3.5" /> From Backlog
                    {backlogTasks.length > 0 && <span className="bg-blue-100 text-blue-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{backlogTasks.length}</span>}
                  </button>
                  {currentView && (
                    <button
                      onClick={effectiveReadOnly ? undefined : () => setShowCompleteModal(true)}
                      disabled={effectiveReadOnly}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Complete Sprint
                    </button>
                  )}
                </>
              )}
              <button
                onClick={effectiveReadOnly ? undefined : () => setShowCreate(true)}
                disabled={effectiveReadOnly}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                <Plus className="w-3.5 h-3.5" /> New Sprint
              </button>
              {currentView && !effectiveReadOnly && (
                <button
                  onClick={() => setPendingDelete(currentView)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  title="ลบ Sprint"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Main: Kanban + Sidebar ── */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-auto p-4">
            {currentView?.status === 'completed' ? (
              /* Completed sprint - read only summary */
              <div className="text-center py-12 text-gray-400">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-400" />
                <p className="text-base font-semibold text-gray-700 mb-1">{currentView.name} เสร็จสมบูรณ์แล้ว</p>
                <p className="text-sm text-gray-400 mb-4">Completed {(currentView.taskSnapshots ?? []).filter(t => t.status === 'done').length}/{(currentView.taskSnapshots ?? []).length} tasks</p>
                <button onClick={() => setViewingCompleted(currentView)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors">
                  <Eye className="w-4 h-4" /> ดูรายละเอียด Sprint นี้
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 min-h-[400px]">
                <KanbanCol title="To Do" colorDot="bg-gray-400" tasks={todoTasks}
                  onTaskClick={onTaskClick} onMove={handleMove}
                  onAddTask={() => setShowAddBacklog(true)} toast={toast} />
                <KanbanCol title="In Progress" colorDot="bg-yellow-400" tasks={inProgressTasks}
                  onTaskClick={onTaskClick} onMove={handleMove} toast={toast} />
                <KanbanCol title="Done" colorDot="bg-green-500" tasks={doneTasks}
                  onTaskClick={onTaskClick} onMove={handleMove} toast={toast} />
              </div>
            )}

            {/* Sprint History */}
            {completedSprints.length > 0 && (
              <div className="mt-6">
                <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <Flag className="w-4 h-4 text-gray-400" /> Sprint History
                </h4>
                <div className="space-y-2">
                  {completedSprints.map(s => {
                    const snap = s.taskSnapshots ?? []
                    const doneCount = snap.filter(t => t.status === 'done').length
                    const pct = snap.length > 0 ? Math.round((doneCount / snap.length) * 100) : 0
                    return (
                      <div key={s.id} className="bg-white rounded-xl border border-gray-200 px-5 py-3.5 flex items-center justify-between hover:border-blue-300 hover:shadow-sm transition-all group">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-gray-800">{s.name}</span>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-semibold rounded-full">Completed</span>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span>{fmtDate(s.startDate)} – {fmtDate(s.endDate)}</span>
                            <span>·</span>
                            <span>{doneCount}/{snap.length} tasks done</span>
                            <span>·</span>
                            <span className="font-semibold text-blue-600">{pct}% completed</span>
                          </div>
                          {/* Mini progress */}
                          <div className="mt-1.5 w-32 h-1 bg-gray-100 rounded-full overflow-hidden">
                            <div className="h-full bg-green-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                        </div>
                        <button
                          onClick={() => setViewingCompleted(s)}
                          className="ml-4 flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Eye className="w-3.5 h-3.5" /> ดูรายละเอียด
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── Sidebar ── */}
          {currentView?.status !== 'completed' && (
            <div className="w-56 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto p-4 space-y-5">
              {/* Team Members */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Team Members
                </h4>
                {members.length === 0
                  ? <p className="text-xs text-gray-400">ยังไม่มี assignee</p>
                  : <div className="space-y-2.5">
                    {members.map(m => {
                      const mt = sprintTasks.filter(t => t.assignee === m)
                      const md = mt.filter(t => t.status === 'done').length
                      return (
                        <div key={m} className="flex items-center gap-2">
                          <Av name={m} size={7} />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-800 truncate">{m}</div>
                            <div className="text-[10px] text-gray-400">{md}/{mt.length} done</div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                }
              </div>

              {/* Backlog */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <BookOpen className="w-3.5 h-3.5" /> Backlog
                </h4>
                <div className="text-xs text-gray-500 mb-2">{backlogTasks.length} tasks</div>
                <button
                  onClick={effectiveReadOnly ? undefined : () => setShowAddBacklog(true)}
                  disabled={effectiveReadOnly}
                  className="w-full py-1.5 border border-dashed border-blue-300 text-blue-600 text-xs font-medium rounded-lg hover:bg-blue-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  + Add to Sprint
                </button>
              </div>

              {/* All sprints list */}
              <div className="border-t border-gray-100 pt-4">
                <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
                  <Flag className="w-3.5 h-3.5" /> All Sprints
                </h4>
                <div className="space-y-1">
                  {sprints.map(s => (
                    <div key={s.id} className={`flex items-center gap-1 rounded-lg ${s.id === currentView?.id ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <button onClick={() => setViewingSprint(s)}
                        className={`flex-1 text-left px-2 py-1.5 text-xs transition-colors flex items-center justify-between ${s.id === currentView?.id ? 'text-blue-700 font-semibold' : 'text-gray-600'}`}>
                        <span className="truncate">{s.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1 ${s.status === 'active' ? 'bg-green-100 text-green-700' : s.status === 'completed' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-600'}`}>
                          {s.status === 'active' ? 'Active' : s.status === 'completed' ? 'Done' : 'Plan'}
                        </span>
                      </button>
                      <button
                        onClick={effectiveReadOnly ? undefined : () => setPendingDelete(s)}
                        disabled={effectiveReadOnly}
                        className="p-1 text-gray-300 hover:text-red-400 transition-colors flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={effectiveReadOnly ? undefined : () => setShowCreate(true)}
                  disabled={effectiveReadOnly}
                  className="w-full mt-2 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  + New Sprint
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreate && <CreateSprintModal num={sprints.length + 1} onClose={() => setShowCreate(false)} onCreate={handleCreate} />}
      {showAddBacklog && currentView && (
        <AddBacklogModal tasks={backlogTasks} sprint={currentView} onClose={() => setShowAddBacklog(false)} onAdd={handleAddTasks} />
      )}
      {showCompleteModal && currentView && (
        <CompleteSprintModal sprint={currentView} tasks={tasks} sprints={sprints} onClose={() => setShowCompleteModal(false)} onConfirm={handleCompleteSprint} />
      )}
      {pendingDelete && (
        <DeleteSprintModal
          sprint={pendingDelete}
          onClose={() => setPendingDelete(null)}
          onConfirm={() => {
            handleDeleteSprint(pendingDelete.id)
            setPendingDelete(null)
          }}
        />
      )}

      <ToastContainer toasts={toasts} remove={remove} />
    </>
  )
}
