'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import KanbanBoard from '@/components/KanbanBoard'
import TaskModal from '@/components/TaskModal'
import CreateTaskModal from '@/components/CreateTaskModal'
import { Task, CardColor, CardStatus } from '@/types/card'
import { taskService, projectService, Project, assigneeService } from '@/services/api'
import { useAuth } from '@/context/AuthContext'
import { getAllColors, CARD_COLORS, normalizeCardColor } from '@/lib/colors'
import { CheckCircle2, BarChart2, Clock, Trash2, Pencil, Check } from 'lucide-react'
import BacklogView from '@/components/BacklogView'
import SprintBoard from '@/components/SprintBoard'

// ─── Constants ───────────────────────────────────────────────────────────────
const COLOR_HEX: Record<string, string> = {
  red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
  purple: '#a855f7', pink: '#ec4899', orange: '#f97316', gray: '#6b7280',
}

const PROJECT_COLOR_KEY_PREFIX = 'project_color_'

const applyLocalProjectColors = (list: Project[]): Project[] => {
  if (typeof window === 'undefined') return list
  return list.map(p => {
    try {
      const stored = window.localStorage.getItem(`${PROJECT_COLOR_KEY_PREFIX}${p.id}`)
      if (!stored) return p
      return { ...p, color: normalizeCardColor(stored) }
    } catch {
      return p
    }
  })
}

// ─── ColorPicker (top-level — must NOT be inside Home() or it remounts every render) ──
function ColorPicker({
  value,
  onChange,
}: {
  value: CardColor
  onChange: (c: CardColor) => void
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {getAllColors().map((color) => {
        const hex = COLOR_HEX[color] ?? '#6b7280'
        const isSelected = value === color
        return (
          <button
            key={color}
            type="button"
            onClick={() => onChange(color)}
            title={CARD_COLORS[color].label}
            className="relative w-9 h-9 rounded-full focus:outline-none"
            style={{
              backgroundColor: hex,
              boxShadow: isSelected
                ? `0 0 0 3px #fff, 0 0 0 5px ${hex}`
                : '0 1px 4px rgba(0,0,0,0.18)',
              transform: isSelected ? 'scale(1.2)' : 'scale(1)',
              transition: 'transform 0.15s, box-shadow 0.15s',
            }}
          >
            {isSelected && (
              <Check className="w-4 h-4 text-white absolute inset-0 m-auto" strokeWidth={3} />
            )}
          </button>
        )
      })}
    </div>
  )
}

// ─── Toast notification (top-level) ──────────────────────────────────────────
function Toast({
  message,
  type,
  onClose,
}: {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000)
    return () => clearTimeout(t)
  }, [onClose])

  const bg =
    type === 'success'
      ? 'linear-gradient(135deg,#22c55e,#16a34a)'
      : 'linear-gradient(135deg,#ef4444,#dc2626)'

  return (
    <div
      className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl text-white text-sm font-medium"
      style={{ background: bg, animation: 'slideUp 0.3s ease' }}
    >
      <style>{`@keyframes slideUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}`}</style>
      {type === 'success'
        ? <Check className="w-5 h-5 flex-shrink-0" strokeWidth={3} />
        : <span className="text-lg leading-none flex-shrink-0">!</span>}
      <span>{message}</span>
      <button
        onClick={onClose}
        className="ml-2 opacity-70 hover:opacity-100 text-xl leading-none"
      >
        ×
      </button>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
function HomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, isLoading: authLoading, isAuthenticated } = useAuth()
  const isGuest = user?.role === 'guest'

  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false)
  const [projects, setProjects] = useState<Project[]>([])
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null)

  // Create modal state
  const [projectName, setProjectName] = useState('')
  const [projectPrefix, setProjectPrefix] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectAssignee, setProjectAssignee] = useState('')
  const [projectError, setProjectError] = useState('')
  const [isCreatingProject, setIsCreatingProject] = useState(false)
  const [projectAssigneeOptions, setProjectAssigneeOptions] = useState<string[]>([])
  const [isProjectAssigneeLoading, setIsProjectAssigneeLoading] = useState(false)
  const [projectAssigneeQuery, setProjectAssigneeQuery] = useState('')

  // Settings tab state
  const [editName, setEditName] = useState('')
  const [editPrefix, setEditPrefix] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editAssignee, setEditAssignee] = useState('')
  const [editColor, setEditColor] = useState<CardColor>('blue')
  const [editError, setEditError] = useState('')
  const [isSavingEdit, setIsSavingEdit] = useState(false)
  const [isDeleteProjectModalOpen, setIsDeleteProjectModalOpen] = useState(false)
  const [isDeletingProject, setIsDeletingProject] = useState(false)

  const [activeTab, setActiveTab] = useState('overview')
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  // Ref for modal click handling - must be at top level
  const mouseDownTargetProject = useRef<EventTarget | null>(null)

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type })
  }

  // ── URL sync ──
  useEffect(() => {
    const param = searchParams.get('projectId')
    if (param) {
      setSelectedProjectId(Number(param))
      return
    }
    setSelectedProjectId(null)
  }, [searchParams])

  // ── Auth + initial fetch ──
  useEffect(() => {
    if (!authLoading && !isAuthenticated) { router.push('/login'); return }
    if (!authLoading && isAuthenticated) {
      const fetchProjects = async () => {
        try {
          let fresh = (await projectService.getProjects()) || []
          // Guest users only see their invited projects
          if (isGuest && user?.projectIds && user.projectIds.length > 0) {
            const allowedIds = user.projectIds.map(Number)
            fresh = fresh.filter(p => allowedIds.includes(Number(p.id)))
          }
          setProjects(applyLocalProjectColors(fresh))
        }
        catch { setProjects([]) }
      }
      Promise.all([fetchTasks(), fetchProjects()])
    }
  }, [isAuthenticated, authLoading, router])

  // ── Populate Settings form when project changes ──
  useEffect(() => {
    const p = projects.find(p => p.id === selectedProjectId)
    if (p) {
      setEditName(p.name)
      setEditPrefix(p.prefix ?? '')
      setEditDescription(p.description ?? '')
      setEditAssignee(p.assignee ?? '')
      setEditColor(normalizeCardColor(p.color))
      setEditError('')
    }
  }, [selectedProjectId, projects])

  // ── Data fetchers ──
  const fetchTasks = async () => {
    try { setLoading(true); setTasks(await taskService.getTasks()) }
    catch { setTasks([]) }
    finally { setLoading(false) }
  }

  // ── Task handlers ──
  const handleTaskClick = (task: Task) => setSelectedTask(task)
  const handleCloseModal = () => setSelectedTask(null)

  const handleUpdateTask = async (updatedTask: Task) => {
    try {
      console.log('[handleUpdateTask] Updating task:', {
        id: updatedTask.id,
        teamDependencyIds: updatedTask.teamDependencyIds,
      })
      const result = await taskService.updateTask(updatedTask.id, updatedTask)
      console.log('[handleUpdateTask] Updated result:', {
        id: result.id,
        teamDependencyIds: result.teamDependencyIds,
      })
      // Use API response result instead of local updatedTask
      setTasks(tasks.map(t => t.id === result.id ? result : t))
      setSelectedTask(null)
      showToast('Task updated successfully ✓')
    } catch (err: any) {
      console.error('[handleUpdateTask] Error:', err)
      showToast('Failed to update task', 'error')
    }
  }

  const handleDeleteTask = async (taskId: string) => {
    if (isGuest) {
      showToast('Guest ดูอย่างเดียว ลบ Task ไม่ได้', 'error')
      return
    }
    setTasks(prev => prev.filter(t => t.id !== taskId))
    try { await taskService.deleteTask(taskId) }
    catch { fetchTasks() } // revert if API fails
  }

  const handleTaskStatusChange = async (taskId: string, newStatus: CardStatus) => {
    if (isGuest) {
      showToast('Guest ดูอย่างเดียว เปลี่ยนสถานะ Task ไม่ได้', 'error')
      return
    }
    const cur = tasks.find(t => t.id === taskId)
    if (!cur || cur.status === newStatus) return
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: newStatus } : t))
    try { await taskService.updateTask(taskId, { status: newStatus }) }
    catch { setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: cur.status } : t)) }
  }

  const filteredTasks = tasks.filter(task => {
    if (filter !== 'all' && task.priority !== filter) return false
    if (selectedProjectId !== null) {
      const belongsToProject = task.projectId === selectedProjectId
      const isInTeamDependency = task.teamDependencyIds?.includes(selectedProjectId) ?? false
      if (!belongsToProject && !isInTeamDependency) return false
    }
    return true
  })

  // ── Create project ──
  const resetCreateForm = () => {
    setProjectName(''); setProjectPrefix('');
    setProjectDescription(''); setProjectAssignee(''); setProjectAssigneeOptions([]); setProjectAssigneeQuery('')
    setProjectError('')
  }

  const handleCreateProject = async () => {
    if (isGuest) {
      setProjectError('Guest ดูอย่างเดียว สร้าง Project ไม่ได้')
      showToast('Guest ดูอย่างเดียว สร้าง Project ไม่ได้', 'error')
      return
    }
    setProjectError('')
    if (!projectName.trim() || !projectPrefix.trim()) {
      setProjectError('กรุณากรอก Title และ Task Title')
      return
    }
    try {
      setIsCreatingProject(true)
      await projectService.createProject({
        name: projectName.trim(),
        prefix: projectPrefix.trim(),
        description: projectDescription.trim() || undefined,
        assignee: projectAssignee.trim() || undefined,
        color: 'blue',
      })
      const fresh = (await projectService.getProjects()) || []
      setProjects(applyLocalProjectColors(fresh))
      resetCreateForm()
      setIsCreateProjectModalOpen(false)
      showToast('สร้าง Project เรียบร้อยแล้ว ✓')
    } catch (e: any) {
      setProjectError(e.message || 'สร้าง Project ไม่สำเร็จ')
    } finally {
      setIsCreatingProject(false)
    }
  }

  useEffect(() => {
    if (!isCreateProjectModalOpen) return
    if (!projectAssigneeQuery) {
      setProjectAssigneeOptions([])
      return
    }
    let cancelled = false
    setIsProjectAssigneeLoading(true)
    assigneeService.searchAssignees(projectAssigneeQuery)
      .then(emails => {
        if (cancelled) return
        setProjectAssigneeOptions(emails)
      })
      .catch(() => {
        if (cancelled) return
        setProjectAssigneeOptions([])
      })
      .finally(() => {
        if (cancelled) return
        setIsProjectAssigneeLoading(false)
      })
    return () => { cancelled = true }
  }, [projectAssigneeQuery, isCreateProjectModalOpen])

  // ── Save edit (Settings tab) ──
  const handleSaveEdit = async () => {
    setEditError('')
    if (!editName.trim() || !editPrefix.trim()) {
      setEditError('กรุณากรอกชื่อ Project และ Prefix')
      return
    }
    if (!selectedProjectId) return
    if (isGuest) {
      setEditError('Guest ดูอย่างเดียว แก้ไข Project ไม่ได้')
      showToast('Guest ดูอย่างเดียว แก้ไข Project ไม่ได้', 'error')
      return
    }
    try {
      setIsSavingEdit(true)
      await projectService.updateProject(selectedProjectId, {
        name: editName.trim(),
        prefix: editPrefix.trim(),
        description: editDescription.trim() || null,
        assignee: editAssignee.trim() || null,
        color: editColor,
      })
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(`${PROJECT_COLOR_KEY_PREFIX}${selectedProjectId}`, editColor)
        } catch { }
      }
      const fresh = (await projectService.getProjects()) || []
      setProjects(applyLocalProjectColors(fresh))
      showToast('บันทึกการเปลี่ยนแปลงเรียบร้อยแล้ว ✓')
    } catch (e: any) {
      setEditError(e.message || 'บันทึกไม่สำเร็จ')
      showToast('เกิดข้อผิดพลาด: ' + (e.message || 'บันทึกไม่สำเร็จ'), 'error')
    } finally {
      setIsSavingEdit(false)
    }
  }

  // ── Delete project ──
  const handleDeleteProject = async () => {
    if (!selectedProjectId) return
    if (isGuest) {
      setEditError('Guest ดูอย่างเดียว ลบ Project ไม่ได้')
      showToast('Guest ดูอย่างเดียว ลบ Project ไม่ได้', 'error')
      return
    }
    try {
      setIsDeletingProject(true)
      await projectService.deleteProject(selectedProjectId)
      const fresh = (await projectService.getProjects()) || []
      setProjects(applyLocalProjectColors(fresh))
      showToast('ลบ Project เรียบร้อยแล้ว')
      handleBackToProjects()
    } catch (e: any) {
      setEditError(e.message || 'ลบ Project ไม่สำเร็จ')
      showToast('ลบไม่สำเร็จ: ' + (e.message || ''), 'error')
    } finally {
      setIsDeletingProject(false)
      setIsDeleteProjectModalOpen(false)
    }
  }

  // ── Stats ──
  const getProjectStats = (projectId: number) => {
    const pt = tasks.filter(t =>
      t.projectId === projectId ||
      (t.teamDependencyIds?.includes(projectId) ?? false)
    )
    const total = pt.length
    const done = pt.filter(t => t.status === 'done').length
    const inProgress = pt.filter(t => t.status === 'inprogress').length
    const percent = total === 0 ? 0 : Math.round((done / total) * 100)
    let statusLabel = 'No Tasks'; let statusClass = 'bg-gray-100 text-gray-600'
    if (total > 0 && done === 0) { statusLabel = 'Not Started'; statusClass = 'bg-yellow-100 text-yellow-800' }
    else if (total > 0 && done > 0 && done < total) { statusLabel = 'In Progress'; statusClass = 'bg-blue-100 text-blue-700' }
    else if (total > 0 && done === total) { statusLabel = 'Completed'; statusClass = 'bg-green-100 text-green-700' }
    return { total, done, inProgress, percent, statusLabel, statusClass }
  }

  const getOwnerDisplay = () => {
    const name = user?.name; if (!name) return null
    const parts = name.split(' ').filter(Boolean)
    const initials = parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : name.slice(0, 2)
    return { name, initials: initials.toUpperCase() }
  }

  const handleSelectProject = (id: number | string) => {
    setActiveTab('overview')
    const p = new URLSearchParams(searchParams.toString())
    p.set('projectId', String(id))
    router.push(`/?${p.toString()}`)
  }

  const handleBackToProjects = () => {
    const p = new URLSearchParams(searchParams.toString())
    p.delete('projectId')
    router.push(p.toString() ? `/?${p.toString()}` : '/')
    setFilter('all'); setActiveTab('overview')
  }

  // ── Loading / auth guard ──
  if (authLoading) return (
    <div className="h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        <p className="mt-4 text-gray-600">Loading...</p>
      </div>
    </div>
  )
  if (!isAuthenticated) return null

  const selectedProject = projects.find(p => p.id === selectedProjectId)

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      <div className="flex flex-1 overflow-hidden">
        {sidebarOpen && <Sidebar />}

        <div className="flex-1 flex flex-col overflow-hidden">
          {selectedProjectId === null ? (
            /* ── Projects List ── */
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
                  <p className="text-gray-500 text-sm mt-1">เลือก Project เพื่อดู Task บนบอร์ด</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (isGuest) {
                      showToast('Guest ดูอย่างเดียว สร้าง Project ไม่ได้', 'error')
                      return
                    }
                    resetCreateForm()
                    setIsCreateProjectModalOpen(true)
                  }}
                  disabled={isGuest}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  + New Project
                </button>
              </div>

              {projects.length === 0 ? (
                <div className="mt-16 flex flex-col items-center text-gray-400 gap-2">
                  <BarChart2 className="w-10 h-10 opacity-30" />
                  <p className="text-sm font-medium">ยังไม่มี Project</p>
                  <p className="text-xs">กดปุ่ม New Project เพื่อเริ่มต้น</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {projects.map((project) => {
                    const stats = getProjectStats(project.id)
                    const owner = getOwnerDisplay()
                    const colorKey = normalizeCardColor(project.color)
                    const hex = COLOR_HEX[colorKey] ?? '#6b7280'
                    return (
                      <button
                        key={project.id}
                        type="button"
                        onClick={() => handleSelectProject(project.id)}
                        className="text-left bg-white rounded-xl border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all p-5 group"
                      >
                        <div className="flex items-center gap-2 mb-3">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: hex }} />
                          <span className="text-xs font-mono font-semibold text-gray-400 uppercase tracking-wide">
                            {project.prefix ?? `PRJ-${project.id}`}
                          </span>
                          <span className={`ml-auto px-2 py-0.5 rounded-full text-[10px] font-semibold ${stats.statusClass}`}>
                            {stats.statusLabel}
                          </span>
                        </div>
                        <div className="text-base font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                          {project.name}
                        </div>
                        {project.description && (
                          <p className="text-xs text-gray-400 line-clamp-2 mb-3">{project.description}</p>
                        )}
                        {owner && (
                          <div className="flex items-center gap-1.5 mb-3">
                            <div className="h-5 w-5 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-[10px] font-bold">
                              {owner.initials}
                            </div>
                            <span className="text-xs text-gray-500">{owner.name}</span>
                          </div>
                        )}
                        <div className="mt-auto">
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>{stats.total > 0 ? `${stats.done}/${stats.total} Done` : 'ไม่มี Task'}</span>
                            <span className="font-semibold text-gray-600">{stats.percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{ width: `${stats.percent}%`, backgroundColor: hex }}
                            />
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          ) : (
            /* ── Project Detail ── */
            <>
              {(() => {
                const stats = getProjectStats(selectedProjectId!)
                const owner = getOwnerDisplay()
                const baseColorKey = normalizeCardColor(selectedProject?.color)
                const effectiveColorKey = activeTab === 'settings' ? editColor : baseColorKey
                const hex = COLOR_HEX[effectiveColorKey] ?? '#3b82f6'
                const todoCount = tasks.filter(t => t.projectId === selectedProjectId && t.status === 'todo').length
                const inProgressCount = tasks.filter(t => t.projectId === selectedProjectId && t.status === 'inprogress').length
                const backlogCount = tasks.filter(t => t.projectId === selectedProjectId && t.status === 'backlog').length

                return (
                  <div className="bg-white border-b border-gray-200 shadow-sm">
                    {/* ── Compact header bar (like image 2) ── */}
                    <div className="px-6 py-3 flex items-center gap-3">
                      {/* Project color icon */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                        style={{ backgroundColor: hex }}
                      >
                        {selectedProject?.name?.charAt(0).toUpperCase()}
                      </div>

                      {/* Name + meta */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h1 className="text-base font-bold text-gray-900 leading-tight">{selectedProject?.name}</h1>
                          {selectedProject?.prefix && (
                            <span className="text-xs font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
                              #{selectedProject.prefix}
                            </span>
                          )}
                          {owner && (
                            <span className="text-xs text-gray-400">
                              Owner: <span className="text-gray-600 font-medium">{owner.name}</span>
                            </span>
                          )}
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${stats.statusClass}`}>
                            {stats.statusLabel}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <button className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4zm0 6a2 2 0 110-4 2 2 0 010 4z" />
                        </svg>
                      </button>
                    </div>

                    {/* ── Tabs ── */}
                    <div className="flex border-t border-gray-100 px-6">
                      {[
                        { id: 'overview', label: 'Overview' },
                        { id: 'backlog', label: 'Backlog' },
                        { id: 'sprint-board', label: 'Sprint Board' },
                        { id: 'settings', label: 'Settings' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id)}
                          className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${activeTab === tab.id
                            ? 'text-blue-600 border-blue-600'
                            : 'text-gray-400 border-transparent hover:text-gray-700'
                            }`}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* ── Tab content ── */}
              {activeTab === 'overview' && (() => {
                const stats = getProjectStats(selectedProjectId!)
                const owner = getOwnerDisplay()
                const colorKey = normalizeCardColor(selectedProject?.color)
                const hex = COLOR_HEX[colorKey] ?? '#3b82f6'
                const todoCount = tasks.filter(t => t.projectId === selectedProjectId && t.status === 'todo').length
                const inProgressCount = tasks.filter(t => t.projectId === selectedProjectId && t.status === 'inprogress').length
                const backlogCount = tasks.filter(t => t.projectId === selectedProjectId && t.status === 'backlog').length

                // Simulate recent activity from tasks
                const recentTasks = [...tasks]
                  .filter(t => t.projectId === selectedProjectId)
                  .slice(0, 5)

                const statusLabel: Record<string, string> = {
                  done: 'completed task',
                  inprogress: 'moved to In Progress',
                  todo: 'added to To Do',
                  backlog: 'added to Backlog',
                }

                return (
                  <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                    {/* 3-column cards */}
                    <div className="grid grid-cols-3 gap-5 mb-6">

                      {/* Card 1: Project Overview */}
                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-2">Project Overview</h3>
                        <p className="text-xs text-gray-500 leading-relaxed mb-4">
                          {selectedProject?.description || 'ยังไม่มี description สำหรับ Project นี้'}
                        </p>
                        <div className="border-t border-gray-100 pt-3 space-y-2">
                          {owner && (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400 w-24">Project Owner</span>
                              <div className="flex items-center gap-1.5">
                                <div
                                  className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[9px] font-bold"
                                  style={{ background: 'linear-gradient(135deg,#6366f1,#8b5cf6)' }}
                                >
                                  {owner.initials}
                                </div>
                                <span className="text-xs font-medium text-gray-700">{owner.name}</span>
                              </div>
                            </div>
                          )}
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-24">Status</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${stats.statusClass}`}>
                              {stats.statusLabel}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400 w-24">Prefix</span>
                            <span className="text-xs font-mono font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                              {selectedProject?.prefix ?? '—'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Card 2: Project Summary */}
                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-4">Project Summary</h3>
                        <div className="flex items-baseline gap-2 mb-4">
                          <span className="text-3xl font-bold text-gray-900">{stats.total}</span>
                          <span className="text-xs text-gray-400">Total Tasks</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-yellow-400 rounded-lg p-2.5 text-center">
                            <div className="text-xl font-bold text-white">{todoCount}</div>
                            <div className="text-[10px] text-yellow-100 mt-0.5">To Do</div>
                          </div>
                          <div className="bg-blue-500 rounded-lg p-2.5 text-center">
                            <div className="text-xl font-bold text-white">{inProgressCount}</div>
                            <div className="text-[10px] text-blue-100 mt-0.5">In Progress</div>
                          </div>
                          <div className="bg-green-500 rounded-lg p-2.5 text-center">
                            <div className="text-xl font-bold text-white">{stats.done}</div>
                            <div className="text-[10px] text-green-100 mt-0.5">Done</div>
                          </div>
                        </div>
                        {/* Mini progress bar */}
                        <div className="mt-4">
                          <div className="flex justify-between text-[11px] text-gray-400 mb-1">
                            <span>Overall Progress</span>
                            <span className="font-semibold text-gray-700">{stats.percent}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${stats.percent}%`, background: `linear-gradient(90deg,#3b82f6,#6366f1)` }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Card 3: Active Sprint (placeholder) */}
                      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1">Active Sprint</h3>
                        {backlogCount > 0 || stats.total > 0 ? (
                          <>
                            <p className="text-xs text-blue-600 font-semibold mb-1">Current Sprint</p>
                            <p className="text-xs text-gray-400 mb-3">
                              {stats.total} Tasks In Sprint
                            </p>
                            <div className="text-xs text-gray-400 mb-4">
                              <div className="flex items-center gap-1 mb-1">
                                <Clock className="w-3 h-3" />
                                <span>In Progress: {inProgressCount} tasks</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                                <span>Completed: {stats.done} tasks</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setActiveTab('sprint-board')}
                              className="w-full py-2 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                            >
                              View Sprint Board
                            </button>
                          </>
                        ) : (
                          <div className="mt-2 text-xs text-gray-400 text-center py-4">
                            <BarChart2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            ยังไม่มี Sprint ที่ active
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Recent Activity */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                      <div className="px-5 py-4 border-b border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-900">Recent Activity</h3>
                      </div>
                      {recentTasks.length === 0 ? (
                        <div className="px-5 py-8 text-center text-gray-400 text-sm">ยังไม่มีกิจกรรม</div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {recentTasks.map((task, i) => {
                            const timeAgo = ['5 mins ago', '12 mins ago', '1 hour ago', '2 hours ago', '3 hours ago'][i] || '—'
                            const action = statusLabel[task.status] ?? 'updated'
                            const initial = task.title?.charAt(0)?.toUpperCase() ?? '?'
                            const colors = ['#6366f1', '#3b82f6', '#22c55e', '#f59e0b', '#ec4899']
                            const bg = colors[i % colors.length]
                            return (
                              <div key={task.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50 transition-colors">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                  style={{ backgroundColor: bg }}
                                >
                                  {initial}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <span className="text-sm text-gray-700">
                                    Task{' '}
                                    <span className="font-medium text-gray-900">
                                      &quot;{task.title}&quot;
                                    </span>{' '}
                                    {action}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })()}

              {activeTab === 'sprint-board' && (
                <SprintBoard
                  tasks={tasks}
                  projectId={selectedProjectId!}
                  onTaskClick={handleTaskClick}
                  onTaskStatusChange={handleTaskStatusChange}
                  onCreateTask={() => {
                    if (isGuest) {
                      showToast('Guest ดูอย่างเดียว สร้าง Task ไม่ได้', 'error')
                      return
                    }
                    setIsCreateModalOpen(true)
                  }}
                  readOnly={isGuest}
                />
              )}

              {activeTab === 'backlog' && (
                <BacklogView
                  tasks={tasks}
                  projectId={selectedProjectId!}
                  onCreateTask={() => {
                    if (isGuest) {
                      showToast('Guest ดูอย่างเดียว สร้าง Task ไม่ได้', 'error')
                      return
                    }
                    setIsCreateModalOpen(true)
                  }}
                  onTaskClick={handleTaskClick}
                  onDeleteTask={handleDeleteTask}
                  onGoToSprintBoard={() => setActiveTab('sprint-board')}
                  readOnly={isGuest}
                />
              )}

              {activeTab === 'settings' && (
                <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                  <div className="max-w-xl bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                    <h2 className="text-lg font-bold text-gray-900 mb-1">Project Settings</h2>
                    <p className="text-sm text-gray-400 mb-6">แก้ไขรายละเอียดของ Project นี้</p>

                    {editError && (
                      <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        {editError}
                      </div>
                    )}

                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Project Name</label>
                          <input
                            type="text" value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="เช่น Botnoi Flow"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1.5">Prefix</label>
                          <input
                            type="text" value={editPrefix}
                            onChange={(e) => setEditPrefix(e.target.value.toUpperCase())}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                            placeholder="เช่น BNF"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
                        <textarea
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                          placeholder="รายละเอียดของโปรเจกต์ (ไม่บังคับ)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Owner</label>
                        <input
                          type="text"
                          value={editAssignee}
                          onChange={(e) => setEditAssignee(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          placeholder="ชื่อเจ้าของโปรเจกต์"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2.5">Project Color</label>
                        <ColorPicker value={editColor} onChange={setEditColor} />
                        <p className="text-xs text-gray-400 mt-2">
                          สีที่เลือก:{' '}
                          <span className="font-semibold" style={{ color: COLOR_HEX[editColor] }}>
                            {CARD_COLORS[editColor]?.label}
                          </span>
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                        <button
                          type="button"
                          onClick={() => setIsDeleteProjectModalOpen(true)}
                          disabled={isGuest}
                          className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors text-sm font-medium"
                        >
                          <Trash2 className="w-4 h-4" /> ลบ Project นี้
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          disabled={isSavingEdit || isGuest}
                          className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-semibold"
                        >
                          <Pencil className="w-4 h-4" />
                          {isSavingEdit ? 'กำลังบันทึก...' : 'บันทึกการเปลี่ยนแปลง'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <TaskModal task={selectedTask} onClose={handleCloseModal} onUpdate={handleUpdateTask} onDelete={handleDeleteTask} projects={projects} selectedProjectId={selectedProjectId} />

      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        currentProjectId={selectedProjectId}
        onTaskCreated={() => { setIsCreateModalOpen(false); fetchTasks() }}
      />

      {/* Create Project Modal */}
      {isCreateProjectModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
          onMouseDown={(e) => { mouseDownTargetProject.current = e.target }}
          onClick={(e) => {
            if (mouseDownTargetProject.current === e.currentTarget) {
              setIsCreateProjectModalOpen(false); resetCreateForm()
            }
          }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-3xl mx-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Create New Project</h2>
              <button
                onClick={() => { setIsCreateProjectModalOpen(false); resetCreateForm() }}
                className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors text-xl"
              >×</button>
            </div>

            {projectError && (
              <div className="mx-6 mt-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                {projectError}
              </div>
            )}

            <div className="px-6 py-5 space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="Enter project title"
                  autoFocus
                />
              </div>

              {/* Task Title */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Task Title</label>
                <input
                  type="text"
                  value={projectPrefix}
                  onChange={(e) => setProjectPrefix(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                  placeholder="BNC / BNF"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none min-h-[9rem]"
                  placeholder="Enter task description"
                />
              </div>

              {/* Owner */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Owner</label>
                <div className="relative">
                  <input
                    type="text"
                    value={projectAssignee}
                    onChange={(e) => {
                      setProjectAssignee(e.target.value)
                      setProjectAssigneeQuery(e.target.value)
                    }}
                    className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="ค้นหาหรือระบุชื่อเจ้าของโปรเจกต์"
                  />
                  {isProjectAssigneeLoading && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-gray-400">
                      Loading...
                    </div>
                  )}
                  {projectAssigneeOptions.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-auto text-sm">
                      {projectAssigneeOptions.map((email) => (
                        <button
                          key={email}
                          type="button"
                          onClick={() => {
                            setProjectAssignee(email)
                            setProjectAssigneeQuery('')
                            setProjectAssigneeOptions([])
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
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => { setIsCreateProjectModalOpen(false); resetCreateForm() }}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                disabled={isCreatingProject}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreatingProject}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-semibold"
              >
                {isCreatingProject ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {isDeleteProjectModalOpen && selectedProject && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => { if (!isDeletingProject) setIsDeleteProjectModalOpen(false) }}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">ลบ Project นี้?</h2>
              <p className="text-sm text-gray-500 mt-1">
                คุณแน่ใจหรือไม่ว่าต้องการลบ &quot;{selectedProject.name}&quot; ทั้ง Task และ Sprint ที่เกี่ยวข้องจะถูกลบออกด้วย
              </p>
            </div>
            <div className="px-6 py-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteProjectModalOpen(false)}
                disabled={isDeletingProject}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleDeleteProject}
                disabled={isDeletingProject}
                className="px-5 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold hover:bg-red-700 shadow-sm disabled:opacity-50"
              >
                {isDeletingProject ? 'กำลังลบ...' : 'ลบ Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  )
}
