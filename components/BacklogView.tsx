'use client'

import { useState, useMemo } from 'react'
import { Task } from '@/types/card'
import { Filter, Search, Plus, ChevronDown, Trash2 } from 'lucide-react'

// ─── Priority badge ───────────────────────────────────────────────────────────
function PriorityBadge({ priority }: { priority: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    high:   { label: 'High',   bg: '#ef4444', text: '#fff' },
    medium: { label: 'Medium', bg: '#f97316', text: '#fff' },
    low:    { label: 'Low',    bg: '#22c55e', text: '#fff' },
    urgent: { label: 'Urgent', bg: '#a855f7', text: '#fff' },
  }
  const s = map[priority?.toLowerCase()] ?? { label: priority ?? '—', bg: '#9ca3af', text: '#fff' }
  return (
    <span
      className="px-2.5 py-0.5 rounded text-xs font-semibold leading-5"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; bg: string; text: string }> = {
    todo:       { label: 'To Do',       bg: '#dbeafe', text: '#2563eb' },
    inprogress: { label: 'In Progress', bg: '#fef9c3', text: '#ca8a04' },
    done:       { label: 'Done',        bg: '#dcfce7', text: '#16a34a' },
  }
  const s = map[status?.toLowerCase()] ?? { label: status ?? '—', bg: '#f3f4f6', text: '#6b7280' }
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold leading-5 whitespace-nowrap"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {s.label}
    </span>
  )
}

// ─── Assignee avatar ──────────────────────────────────────────────────────────
function AssigneeAvatar({ name }: { name?: string }) {
  if (!name) return <span className="text-gray-300 text-xs">—</span>
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')
  // deterministic color from name
  const colors = ['#6366f1','#3b82f6','#22c55e','#f59e0b','#ec4899','#14b8a6','#f97316','#a855f7']
  const idx = name.charCodeAt(0) % colors.length
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
        style={{ backgroundColor: colors[idx] }}
        title={name}
      >
        {initials}
      </div>
      <span className="text-sm text-gray-700 truncate max-w-[80px]">{name}</span>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface BacklogViewProps {
  tasks: Task[]
  projectId: string
  projectPrefix?: string
  onCreateTask: () => void
  onTaskClick: (task: Task) => void
  onDeleteTask: (taskId: string) => void
  onGoToSprintBoard: () => void
  readOnly?: boolean
}

export default function BacklogView({
  tasks,
  projectId,
  projectPrefix,
  onCreateTask,
  onTaskClick,
  onDeleteTask,
  onGoToSprintBoard,
  readOnly = false,
}: BacklogViewProps) {
  const [search, setSearch] = useState('')
  const [priorityFilter, setPriorityFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showSprintMenu, setShowSprintMenu] = useState(false)
  const [availableSprints, setAvailableSprints] = useState<{ id: string; name: string; status: string }[]>([])
  const [dialog, setDialog] = useState<{
    type: 'info' | 'confirm';
    title: string;
    message: string;
    onConfirm?: () => void;
  } | null>(null)

  // Filter tasks
  const filtered = useMemo(() => {
    return tasks
      .filter(t => t.projectId === projectId)
      .filter(t => {
        const q = search.toLowerCase()
        if (q && !t.title?.toLowerCase().includes(q)) return false
        if (priorityFilter !== 'all' && t.priority?.toLowerCase() !== priorityFilter) return false
        if (statusFilter !== 'all' && t.status?.toLowerCase() !== statusFilter) return false
        return true
      })
  }, [tasks, projectId, search, priorityFilter, statusFilter])

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0 && !allSelected

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(t => t.id)))
    }
  }

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const openSprintMenu = () => {
    if (selected.size === 0) return
    if (typeof window === 'undefined') return
    try {
      const key = `sprints_v2_project_${projectId}`
      const raw = window.localStorage.getItem(key)
      if (!raw) {
        setDialog({
          type: 'info',
          title: 'ยังไม่มี Sprint',
          message: 'กรุณาสร้าง Sprint ในหน้า Sprint Board ก่อน',
        })
        return
      }
      const parsed = JSON.parse(raw)
      const list = Array.isArray(parsed)
        ? parsed
            .filter((s: any) => s && (s.status === 'active' || s.status === 'planned'))
            .map((s: any) => ({ id: String(s.id), name: String(s.name ?? 'Untitled Sprint'), status: String(s.status ?? '') }))
        : []
      if (list.length === 0) {
        setDialog({
          type: 'info',
          title: 'ยังไม่มี Sprint ที่พร้อมใช้งาน',
          message: 'ต้องมี Sprint ที่เป็น Active หรือ Planned ก่อนจึงจะเพิ่ม Task ได้',
        })
        return
      }
      setAvailableSprints(list)
      setShowSprintMenu(true)
    } catch {
      setDialog({
        type: 'info',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถอ่านข้อมูล Sprint ได้',
      })
    }
  }

  const handleAddToSprint = (sprintId: string) => {
    if (selected.size === 0) return
    if (typeof window === 'undefined') return

    const key = `sprints_v2_project_${projectId}`
    let raw: string | null = null
    try {
      raw = window.localStorage.getItem(key)
    } catch {
      setDialog({
        type: 'info',
        title: 'เกิดข้อผิดพลาด',
        message: 'ไม่สามารถอ่านข้อมูล Sprint ได้',
      })
      return
    }

    if (!raw) {
      setDialog({
        type: 'info',
        title: 'ยังไม่มี Sprint',
        message: 'กรุณาสร้าง Sprint ในหน้า Sprint Board ก่อน',
      })
      return
    }

    let sprints: any[] = []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) sprints = parsed
    } catch {
      sprints = []
    }

    if (sprints.length === 0) {
      setDialog({
        type: 'info',
        title: 'ยังไม่มี Sprint',
        message: 'กรุณาสร้าง Sprint ในหน้า Sprint Board ก่อน',
      })
      return
    }

    const target = sprints.find(s => s && s.id === sprintId)
    if (!target) {
      setDialog({
        type: 'info',
        title: 'ไม่พบ Sprint',
        message: 'ไม่พบ Sprint ที่เลือก โปรดลองใหม่อีกครั้ง',
      })
      return
    }

    const ids = Array.from(selected)
    const existingIds: string[] = Array.isArray(target.taskIds) ? target.taskIds : []
    const mergedIds = [...existingIds]
    for (const id of ids) {
      if (!mergedIds.includes(id)) mergedIds.push(id)
    }

    const updatedSprints = sprints.map(s =>
      s && s.id === target.id ? { ...s, taskIds: mergedIds } : s
    )

    try {
      window.localStorage.setItem(key, JSON.stringify(updatedSprints))
      window.dispatchEvent(new CustomEvent('sprintsUpdated', { detail: { projectId } }))
    } catch {
      setDialog({
        type: 'info',
        title: 'บันทึกไม่สำเร็จ',
        message: 'ไม่สามารถบันทึกการเปลี่ยนแปลง Sprint ได้',
      })
      return
    }

    try {
      const toastKey = `sprint_last_toast_${projectId}`
      const payload = {
        msg: `✓ เพิ่ม ${ids.length} task ไปยัง ${target.name ?? 'Sprint'}`,
        type: 'success' as const,
      }
      window.localStorage.setItem(toastKey, JSON.stringify(payload))
    } catch {
    }

    setSelected(new Set())
    setShowSprintMenu(false)
    onGoToSprintBoard()
  }

  return (
    <>
    <div className="flex-1 flex flex-col overflow-hidden bg-gray-50">
      {/* ── Page header ── */}
      <div className="px-6 pt-5 pb-3">
        <h2 className="text-lg font-bold text-gray-900">Backlog</h2>
      </div>

      {/* ── Toolbar ── */}
      <div className="px-6 pb-3 flex items-center gap-3">
        {/* Filter button */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors font-medium"
          >
            <Filter className="w-3.5 h-3.5 text-gray-500" />
            Filter
            <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
          </button>

          {showFilterMenu && (
            <div className="absolute left-0 top-full mt-1 bg-white rounded-xl border border-gray-200 shadow-lg z-20 p-3 min-w-[200px]">
              <div className="mb-3">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Priority</div>
                {['all','high','medium','low','urgent'].map(p => (
                  <button
                    key={p}
                    onClick={() => { setPriorityFilter(p); setShowFilterMenu(false) }}
                    className={`w-full text-left px-2 py-1 rounded text-sm capitalize transition-colors ${priorityFilter === p ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {p === 'all' ? 'All Priorities' : p}
                  </button>
                ))}
              </div>
              <div>
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Status</div>
                {['all','todo','inprogress','done'].map(s => (
                  <button
                    key={s}
                    onClick={() => { setStatusFilter(s); setShowFilterMenu(false) }}
                    className={`w-full text-left px-2 py-1 rounded text-sm transition-colors ${statusFilter === s ? 'bg-blue-50 text-blue-600 font-medium' : 'text-gray-700 hover:bg-gray-50'}`}
                  >
                    {s === 'all' ? 'All Statuses' : s === 'inprogress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Active filter chips */}
        {priorityFilter !== 'all' && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            Priority: {priorityFilter}
            <button onClick={() => setPriorityFilter('all')} className="ml-0.5 hover:text-blue-900">×</button>
          </span>
        )}
        {statusFilter !== 'all' && (
          <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
            Status: {statusFilter}
            <button onClick={() => setStatusFilter('all')} className="ml-0.5 hover:text-blue-900">×</button>
          </span>
        )}

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search tasks..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          />
        </div>

        <div className="flex-1" />

        {/* Create Task */}
        <button
          onClick={readOnly ? undefined : onCreateTask}
          disabled={readOnly}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Task
        </button>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-auto px-6 pb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[40px_120px_1fr_110px_140px_120px_90px_44px_44px] border-b border-gray-200 bg-gray-50">
            {/* Select all checkbox */}
            <div className="flex items-center justify-center py-3 px-2">
              <input
                type="checkbox"
                checked={allSelected}
                ref={el => { if (el) el.indeterminate = someSelected }}
                onChange={toggleAll}
                className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
              />
            </div>
            {['ID', 'Task', 'Priority', 'Assignee', 'Status', 'Estimate', '', ''].map((col, i) => (
              <div
                key={i}
                className="py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-1"
              >
                {col}
                {col && col !== '' && (
                  <ChevronDown className="w-3 h-3 text-gray-400 opacity-60" />
                )}
              </div>
            ))}
          </div>

          {/* Table rows */}
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <Search className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">ไม่พบ Task ที่ตรงกับเงื่อนไข</p>
              {!readOnly && (
                <button
                  onClick={onCreateTask}
                  className="mt-3 text-sm text-blue-600 hover:underline font-medium"
                >
                  + สร้าง Task ใหม่
                </button>
              )}
            </div>
          ) : (
            filtered.map((task, idx) => {
              const isSelected = selected.has(task.id)
              const taskId = task.prefix
                ? `${task.prefix}-${task.id}`
                : projectPrefix
                  ? `${projectPrefix}-${task.id}`
                  : `TASK-${task.id}`
              const estimateHours = (task as any).plannedEstimatedHours
                ? `${(task as any).plannedEstimatedHours}h`
                : task.points
                  ? `${task.points} pts`
                  : '—'

              return (
                <div
                  key={task.id}
                  className={`grid grid-cols-[40px_120px_1fr_110px_140px_120px_90px_44px_44px] border-b border-gray-100 last:border-0 hover:bg-blue-50/30 transition-colors group ${
                    isSelected ? 'bg-blue-50' : idx % 2 === 1 ? 'bg-gray-50/40' : 'bg-white'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="flex items-center justify-center py-3 px-2">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleOne(task.id)}
                      className="w-4 h-4 accent-blue-600 cursor-pointer rounded"
                    />
                  </div>

                  {/* ID */}
                  <div className="flex items-center py-3 px-3">
                    <span className="text-xs font-mono text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
                      {taskId}
                    </span>
                  </div>

                  {/* Task title */}
                  <div className="flex items-center py-3 px-3 min-w-0">
                    <button
                      onClick={() => onTaskClick(task)}
                      className="text-sm text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left truncate font-medium"
                    >
                      {task.title}
                    </button>
                  </div>

                  {/* Priority */}
                  <div className="flex items-center py-3 px-3">
                    <PriorityBadge priority={task.priority} />
                  </div>

                  {/* Assignee */}
                  <div className="flex items-center py-3 px-3 min-w-0">
                    <AssigneeAvatar name={task.assignee} />
                  </div>

                  {/* Status */}
                  <div className="flex items-center py-3 px-3">
                    <StatusBadge status={task.status} />
                  </div>

                  {/* Estimate */}
                  <div className="flex items-center py-3 px-3">
                    <span className="text-sm text-gray-600">{estimateHours}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-center py-3 px-2" />
                </div>
              )
            })
          )}
        </div>

        {/* ── Footer ── */}
        {filtered.length > 0 && (
          <div className="mt-3 flex items-center justify-between min-h-[40px]">
            {/* Left: Select All */}
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={el => { if (el) el.indeterminate = someSelected }}
                  onChange={toggleAll}
                  className="w-4 h-4 accent-blue-600 rounded"
                />
                <span className="text-sm text-gray-600 font-medium">
                  {allSelected ? 'Deselect All' : 'Select All'}
                </span>
              </label>
              {selected.size > 0 && (
                <span className="text-xs text-gray-400">
                  ({selected.size} selected)
                </span>
              )}
            </div>

            {/* Right: show only when something is selected */}
            {selected.size > 0 && !readOnly && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setDialog({
                      type: 'confirm',
                      title: 'ลบ Task ที่เลือก?',
                      message: `คุณต้องการลบ ${selected.size} task ที่เลือกหรือไม่?`,
                      onConfirm: () => {
                        ;[...selected].forEach(id => onDeleteTask(id))
                        setSelected(new Set())
                      },
                    })
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 border border-red-200 text-red-500 bg-white rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  ลบที่เลือก
                </button>
                <div className="relative">
                  <button
                    onClick={openSprintMenu}
                    className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm"
                  >
                    Add to Sprint
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {showSprintMenu && (
                    <div className="absolute right-0 mt-1 w-60 bg-white rounded-xl border border-gray-200 shadow-lg z-30">
                      <div className="px-3 py-2 text-[11px] font-semibold text-gray-400 uppercase tracking-wide border-b border-gray-100">
                        เลือก Sprint
                      </div>
                      {availableSprints.map(s => (
                        <button
                          key={s.id}
                          onClick={() => handleAddToSprint(s.id)}
                          className="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-700 hover:bg-blue-50"
                        >
                          <span className="truncate">{s.name}</span>
                          <span
                            className={`ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                              s.status === 'active'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {s.status === 'active' ? 'Active' : 'Planned'}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

    {dialog && (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDialog(null)}>
        <div
          className="bg-white rounded-2xl w-full max-w-sm mx-4 shadow-2xl"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-base font-bold text-gray-900">{dialog.title}</h2>
          </div>
          <div className="px-5 py-4">
            <p className="text-sm text-gray-600 whitespace-pre-line">{dialog.message}</p>
          </div>
          <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
            {dialog.type === 'confirm' && (
              <button
                onClick={() => setDialog(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                ยกเลิก
              </button>
            )}
            <button
              onClick={() => {
                if (dialog.onConfirm) dialog.onConfirm()
                setDialog(null)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 shadow-sm"
            >
              ตกลง
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  )
}
