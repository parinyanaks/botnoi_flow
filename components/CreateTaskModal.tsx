'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ChevronDown } from 'lucide-react'
import { taskService, projectService, Project, assigneeService } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { ImpactLevel, PriorityLevel, CardLevel } from '@/types/card'

interface CreateTaskModalProps {
  isOpen: boolean
  onClose: () => void
  onTaskCreated: () => void
  currentProjectId: number | null
}

// ─── Avatar badge ─────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
  const palette = ['#6366f1','#3b82f6','#22c55e','#f97316','#a855f7','#ec4899']
  const bg = palette[(name.charCodeAt(0) || 0) % palette.length]
  return (
    <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
      style={{ backgroundColor: bg }}>
      {initials || '?'}
    </div>
  )
}

// ─── Priority badge chip ──────────────────────────────────────────────────────
const P_COLOR: Record<PriorityLevel, string> = {
  P0: '#ef4444', P1: '#f97316', P2: '#eab308', P3: '#22c55e',
}
function PBadge({ v }: { v: PriorityLevel }) {
  return (
    <span className="inline-flex items-center justify-center w-6 h-5 rounded text-white text-[10px] font-bold mr-1 flex-shrink-0"
      style={{ backgroundColor: P_COLOR[v] }}>{v}</span>
  )
}

// ─── State toggle options ─────────────────────────────────────────────────────
const STATES = [
  { value: 'todo',       label: 'To Do',      cls: 'bg-blue-600 text-white' },
  { value: 'inprogress', label: 'In Progress', cls: 'bg-yellow-500 text-white' },
  { value: 'done',       label: 'Done',        cls: 'bg-green-600 text-white' },
]

export default function CreateTaskModal({ isOpen, onClose, onTaskCreated, currentProjectId }: CreateTaskModalProps) {
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'
  const teamDependencyDropdownRef = useRef<HTMLDivElement>(null)
  const [isTeamDependencyOpen, setIsTeamDependencyOpen] = useState(false)

  const [title, setTitle]                 = useState('')
  const [description, setDescription]     = useState('')
  const [assignee, setAssignee]           = useState('')
  const [reporter, setReporter]           = useState(user?.name || '')
  const [status, setStatus]               = useState<'todo' | 'inprogress' | 'done'>('todo')
  const [priorityLevel, setPriorityLevel] = useState<PriorityLevel>('P1')
  const [impact, setImpact]               = useState<ImpactLevel>('high')
  const [plannedStartDate, setPlannedStartDate] = useState('')
  const [plannedEndDate, setPlannedEndDate]           = useState('')
  const [actualStartDate, setActualStartDate]         = useState('')
  const [plannedEstimatedHours, setPlannedEstimatedHours] = useState('0')
  const [cardLevel, setCardLevel]         = useState<CardLevel>('task')
  const [projects, setProjects]           = useState<Project[]>([])
  const [projectId, setProjectId]         = useState<number | null>(null)
  const [teamDependencyIds, setTeamDependencyIds] = useState<number[]>([])
  const [isLoading, setIsLoading]         = useState(false)
  const [error, setError]                 = useState('')
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([])
  const [isAssigneeLoading, setIsAssigneeLoading] = useState(false)
  const [assigneeQuery, setAssigneeQuery] = useState('')

  const currentProject = currentProjectId !== null
    ? projects.find((p) => p.id === currentProjectId) ?? null
    : null

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (teamDependencyDropdownRef.current && !teamDependencyDropdownRef.current.contains(event.target as Node)) {
        setIsTeamDependencyOpen(false)
      }
    }
    if (isTeamDependencyOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isTeamDependencyOpen])

  useEffect(() => {
    if (!isOpen) return
    setReporter(user?.name || '')
    projectService.getProjects().then((data) => {
      setProjects(data)
      if (currentProjectId && data.some((p) => p.id === currentProjectId)) {
        setProjectId(currentProjectId)
      } else if (!projectId && data.length > 0) {
        setProjectId(data[0].id)
      }
    }).catch(() => {})
  }, [isOpen, currentProjectId, user?.name, projectId])

  useEffect(() => {
    if (!isOpen) return
    if (!assigneeQuery) {
      setAssigneeOptions([])
      return
    }
    let cancelled = false
    setIsAssigneeLoading(true)
    assigneeService.searchAssignees(assigneeQuery)
      .then((emails) => {
        if (cancelled) return
        setAssigneeOptions(emails)
      })
      .catch(() => {
        if (cancelled) return
        setAssigneeOptions([])
      })
      .finally(() => {
        if (cancelled) return
        setIsAssigneeLoading(false)
      })
    return () => { cancelled = true }
  }, [assigneeQuery, isOpen])

  if (!isOpen) return null

  const reset = () => {
    setTitle(''); setDescription(''); setAssignee(''); setReporter(user?.name || '')
    setStatus('todo'); setPriorityLevel('P1'); setImpact('high')
    setPlannedStartDate(''); setPlannedEndDate(''); setActualStartDate('')
    setPlannedEstimatedHours('0'); setCardLevel('task'); setTeamDependencyIds([])
    setError('')
  }

  const handleClose = () => { reset(); onClose() }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (isGuest) {
      setError('Guest ดูอย่างเดียว สร้าง Task ไม่ได้')
      return
    }
    if (!projectId) { setError('กรุณาเลือก Project ก่อนสร้าง Task'); return }
    try {
      setIsLoading(true)
      await taskService.createTask({
        title,
        description,
        status,
        priority: impact === 'high' ? 'high' : impact === 'low' ? 'low' : 'medium',
        assignee,
        type: cardLevel as any,
        points: 1,
        projectId,
        teamDependencyIds: teamDependencyIds.length > 0 ? teamDependencyIds : null,
        reporter: reporter || user?.name || '',
        impact,
        urgency: 'medium',
        priorityLevel,
        plannedStartDate: plannedStartDate ? new Date(plannedStartDate) : null,
        plannedEndDate: plannedEndDate ? new Date(plannedEndDate) : null,
        actualStartDate: actualStartDate ? new Date(actualStartDate) : null,
        plannedEstimatedHours: plannedEstimatedHours === '' ? null : Number(plannedEstimatedHours),
        cardLevel,
        ownerId: user?.id || 0,
      })
      reset()
      onTaskCreated()
      onClose()
    } catch (err: any) {
      console.error('Task creation error:', err)
      setError(err?.message || err?.response?.data?.message || 'Failed to create task')
    } finally {
      setIsLoading(false)
    }
  }

  const base = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white'
  const sel  = base + ' appearance-none pr-8'

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div className="bg-white rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create Task</h2>
          <button onClick={handleClose} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── Alerts ── */}
        {error && (
          <div className="mx-6 mt-3 bg-red-50 border border-red-200 text-red-700 px-4 py-2.5 rounded-lg text-sm">{error}</div>
        )}
        {projects.length === 0 && (
          <div className="mx-6 mt-3 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2.5 rounded-lg text-sm">
            ต้องสร้าง Project ก่อนจึงจะสร้าง Task ได้
          </div>
        )}

        {/* ── Form body ── */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              className={base} placeholder="Enter task title" autoFocus />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={base + ' resize-none min-h-[7.5rem]'}
              rows={9}
              placeholder="Enter a description for this task..."
            />
          </div>

          {/* Assignee | Reporter */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Assignee</label>
              <div className="relative">
                <div className="relative flex items-center">
                  {assignee && (
                    <div className="absolute left-2.5 pointer-events-none">
                      <Avatar name={assignee} />
                    </div>
                  )}
                  <input
                    type="text"
                    value={assignee}
                    onChange={(e) => {
                      setAssignee(e.target.value)
                      setAssigneeQuery(e.target.value)
                    }}
                    className={base + (assignee ? ' pl-11' : '')}
                    placeholder="ค้นหาหรือระบุชื่อผู้รับผิดชอบ"
                  />
                </div>
                {isAssigneeLoading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                    Loading...
                  </div>
                )}
                {assigneeOptions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto text-sm">
                    {assigneeOptions.map((email) => (
                      <button
                        key={email}
                        type="button"
                        onClick={() => {
                          setAssignee(email)
                          setAssigneeQuery('')
                          setAssigneeOptions([])
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-blue-50"
                      >
                        {email}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Reporter <span className="text-gray-400 font-normal text-xs">– {user?.name || 'You'}</span>
              </label>
              <div className="relative flex items-center">
                {reporter && <div className="absolute left-2.5 pointer-events-none"><Avatar name={reporter} /></div>}
                <input type="text" value={reporter} onChange={(e) => setReporter(e.target.value)}
                  className={base + (reporter ? ' pl-11' : '')} placeholder="Reporter name" />
              </div>
            </div>
          </div>

          {/* State | Priority Level */}
          <div className="grid grid-cols-2 gap-4">
            {/* State toggle */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">State</label>
              <div className="flex rounded-lg border border-gray-300 overflow-hidden text-xs font-medium">
                {STATES.map((s) => (
                  <button key={s.value} type="button" onClick={() => setStatus(s.value as any)}
                    className={`flex-1 py-2 transition-colors ${status === s.value ? s.cls : 'bg-white text-gray-600 hover:bg-gray-50'}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Priority Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  <PBadge v={priorityLevel} />
                </div>
                <select value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value as PriorityLevel)} className={sel + ' pl-10'}>
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Priority (impact level) | Impact */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Priority</label>
              <div className="relative">
                <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none flex items-center">
                  <PBadge v={priorityLevel} />
                </div>
                <select value={priorityLevel} onChange={(e) => setPriorityLevel(e.target.value as PriorityLevel)} className={sel + ' pl-10'}>
                  <option value="P0">P0</option>
                  <option value="P1">P1</option>
                  <option value="P2">P2</option>
                  <option value="P3">P3</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Impact</label>
              <div className="relative">
                <select value={impact} onChange={(e) => setImpact(e.target.value as ImpactLevel)} className={sel}>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Planned Start Date</label>
              <input type="date" value={plannedStartDate} onChange={(e) => setPlannedStartDate(e.target.value)} className={base} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Planned End Date</label>
              <input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} className={base} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Actual Start Date</label>
              <input type="date" value={actualStartDate} onChange={(e) => setActualStartDate(e.target.value)} className={base} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Planned Estimated Hours</label>
              <div className="relative">
                <input type="number" value={plannedEstimatedHours} onChange={(e) => setPlannedEstimatedHours(e.target.value)}
                  className={base + ' pr-8'} min="0" step="0.5" placeholder="0" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none">h</span>
              </div>
            </div>
          </div>

          {/* Card Level | Sprint */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Card Level</label>
              <div className="relative">
                <select value={cardLevel} onChange={(e) => setCardLevel(e.target.value as CardLevel)} className={sel}>
                  <option value="task">Task</option>
                  <option value="epic">Epic</option>
                  <option value="story">Story</option>
                  <option value="bug">Bug</option>
                  <option value="subtask">Subtask</option>
                  <option value="risk">Risk</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sprint</label>
              <div className="relative">
                {currentProject ? (
                  <div className={base + ' text-gray-700'}>
                    {currentProject.prefix ? `${currentProject.prefix} – ${currentProject.name}` : currentProject.name}
                  </div>
                ) : (
                  <>
                    <select value={projectId ?? ''} onChange={(e) => setProjectId(Number(e.target.value))} className={sel}>
                      <option value="">Backlog</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.prefix ? `${p.prefix} – ${p.name}` : p.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Team Dependency */}
          <div ref={teamDependencyDropdownRef} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Team Dependency
              <span className="text-gray-400 font-normal text-xs ml-1">(Optional)</span>
            </label>
            <button
              type="button"
              onClick={() => setIsTeamDependencyOpen(!isTeamDependencyOpen)}
              className={base + ' flex items-center justify-between text-left'}
            >
              <span className="text-gray-700">
                {teamDependencyIds.length === 0
                  ? 'Select projects...'
                  : `${teamDependencyIds.length} project${teamDependencyIds.length > 1 ? 's' : ''} selected`}
              </span>
              <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isTeamDependencyOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isTeamDependencyOpen && (
              <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg">
                <div className="max-h-48 overflow-y-auto">
                  {projects.filter(p => p.id !== projectId).length === 0 ? (
                    <div className="px-3 py-2.5 text-sm text-gray-500">No other projects available</div>
                  ) : (
                    projects.filter(p => p.id !== projectId).map((project) => (
                      <label
                        key={project.id}
                        className="flex items-center space-x-2 px-3 py-2.5 hover:bg-blue-50 cursor-pointer transition-colors border-b border-gray-50 last:border-b-0"
                      >
                        <input
                          type="checkbox"
                          checked={teamDependencyIds.includes(project.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTeamDependencyIds([...teamDependencyIds, project.id])
                            } else {
                              setTeamDependencyIds(teamDependencyIds.filter(id => id !== project.id))
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                        <span className="text-sm text-gray-700">
                          {project.prefix ? `${project.prefix} – ${project.name}` : project.name}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

        </form>

        {/* ── Footer ── */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button type="button" onClick={handleClose}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit as any} disabled={isLoading || projects.length === 0}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors">
            {isLoading ? 'Creating...' : 'Create'}
          </button>
        </div>

      </div>
    </div>
  )
}
