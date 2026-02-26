'use client'

import { useState, useEffect, useRef } from 'react'
import { Task, CardColor, Project } from '@/types/card'
import { X, AlertCircle, ChevronDown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { taskService } from '@/services/api'
import { getAllColors, CARD_COLORS } from '@/lib/colors'

interface TaskModalProps {
  task: Task | null
  onClose: () => void
  onUpdate: (task: Task) => void
  onDelete?: (taskId: string) => void
  projects?: Project[]
  selectedProjectId?: number | null
}

const getTypeIcon = (type: string) => {
  switch(type) {
    case 'bug': return '🐛'
    case 'story': return '📖'
    case 'task': return '✓'
    case 'design': return '🎨'
    default: return '📋'
  }
}

export default function TaskModal({ task, onClose, onUpdate, onDelete, projects = [], selectedProjectId }: TaskModalProps) {
  const { user } = useAuth()
  const [editedTask, setEditedTask] = useState<Task | null>(null)
  const [error, setError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const teamDependencyDropdownRef = useRef<HTMLDivElement>(null)
  const [isTeamDependencyOpen, setIsTeamDependencyOpen] = useState(false)

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
    if (task) {
      setEditedTask(task)
    }
  }, [task])

  if (!task || !editedTask) return null

  const isOwner = user?.id === task.ownerId
  const canEdit = isOwner && user?.role === 'member'

  const handleSubmit = () => {
    if (!canEdit) {
      setError('You can only edit your own tasks')
      return
    }
    console.log('[TaskModal] Submitting task update:', {
      id: editedTask.id,
      title: editedTask.title,
      teamDependencyIds: editedTask.teamDependencyIds,
    })
    onUpdate(editedTask)
  }

  const handleDelete = async () => {
    if (!canEdit) {
      setError('You can only delete your own tasks')
      return
    }

    setError('')
    setIsDeleting(true)

    try {
      await taskService.deleteTask(task.id)
      onDelete?.(task.id)
      setShowDeleteConfirm(false)
      onClose()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete task')
      setIsDeleting(false)
    }
  }

  const handleChange = (field: keyof Task, value: any) => {
    if (!canEdit) {
      setError('You can only edit your own tasks')
      return
    }
    setEditedTask({ ...editedTask, [field]: value })
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" 
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto" 
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{getTypeIcon(task.type)}</span>
              <div>
                <p className="text-xs text-gray-500 font-medium">TASK-{task.id}</p>
                <h2 className="text-xl font-semibold text-gray-900">{task.title}</h2>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Owner Badge */}
          <div className="mt-3 flex items-center space-x-2">
            <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {isOwner ? '✓ Your Task' : '👁️ Viewing Only'}
            </div>
            {!canEdit && (
              <div className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded">
                {user?.role === 'guest' ? 'Guest users cannot edit' : 'Read-only'}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}
        
        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Description</h3>
            <textarea
              value={editedTask.description}
              onChange={(e) => handleChange('description', e.target.value)}
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px] disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Status</h3>
              <select 
                value={editedTask.status}
                onChange={(e) => handleChange('status', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="backlog">Backlog</option>
                <option value="todo">To Do</option>
                <option value="inprogress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Priority</h3>
              <select 
                value={editedTask.priority}
                onChange={(e) => handleChange('priority', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Assignee</h3>
              <div className="flex items-center space-x-2 px-3 py-2 border border-gray-300 rounded-md">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-semibold">
                  {editedTask.assignee.charAt(0)}
                </div>
                <input
                  type="text"
                  value={editedTask.assignee}
                  onChange={(e) => handleChange('assignee', e.target.value)}
                  disabled={!canEdit}
                  className="flex-1 outline-none disabled:bg-transparent disabled:cursor-not-allowed"
                />
              </div>
            </div>
            
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Story Points</h3>
              <input 
                type="number" 
                value={editedTask.points}
                onChange={(e) => handleChange('points', parseInt(e.target.value))}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Reporter</h3>
              <input
                type="text"
                value={editedTask.reporter || ''}
                onChange={(e) => handleChange('reporter', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Card Level</h3>
              <select
                value={editedTask.cardLevel || 'task'}
                onChange={(e) => handleChange('cardLevel', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="epic">Epic</option>
                <option value="task">Task</option>
                <option value="bug">Bug</option>
                <option value="story">Story</option>
                <option value="risk">Risk</option>
                <option value="subtask">Subtask</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Impact</h3>
              <select
                value={editedTask.impact || 'medium'}
                onChange={(e) => handleChange('impact', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Urgency</h3>
              <select
                value={editedTask.urgency || 'medium'}
                onChange={(e) => handleChange('urgency', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Priority Level (P0–P3)</h3>
              <select
                value={editedTask.priorityLevel || 'P2'}
                onChange={(e) => handleChange('priorityLevel', e.target.value)}
                disabled={!canEdit}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
              >
                <option value="P0">P0</option>
                <option value="P1">P1</option>
                <option value="P2">P2</option>
                <option value="P3">P3</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Planned Start Date</h3>
                <input
                  type="date"
                  value={editedTask.plannedStartDate ? editedTask.plannedStartDate.toISOString().slice(0, 10) : ''}
                  onChange={(e) =>
                    handleChange(
                      'plannedStartDate',
                      e.target.value ? new Date(e.target.value) : null
                    )
                  }
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Planned End Date</h3>
                <input
                  type="date"
                  value={editedTask.plannedEndDate ? editedTask.plannedEndDate.toISOString().slice(0, 10) : ''}
                  onChange={(e) =>
                    handleChange(
                      'plannedEndDate',
                      e.target.value ? new Date(e.target.value) : null
                    )
                  }
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Planned Hours</h3>
                <input
                  type="number"
                  value={editedTask.plannedEstimatedHours ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'plannedEstimatedHours',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Actual Hours</h3>
                <input
                  type="number"
                  value={editedTask.actualEstimatedHours ?? ''}
                  onChange={(e) =>
                    handleChange(
                      'actualEstimatedHours',
                      e.target.value === '' ? null : Number(e.target.value)
                    )
                  }
                  disabled={!canEdit}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Labels</h3>
            <input
              type="text"
              value={(editedTask.labels || []).join(', ')}
              onChange={(e) =>
                handleChange(
                  'labels',
                  e.target.value
                    .split(',')
                    .map((v) => v.trim())
                    .filter((v) => v.length > 0)
                )
              }
              disabled={!canEdit}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Team Dependency
              <span className="text-gray-400 font-normal text-xs ml-1">(which projects should display this task)</span>
            </h3>
            <div className="border border-gray-300 rounded-md p-3 max-h-48 overflow-y-auto bg-white">
              {projects.filter(p => p.id !== task?.projectId).length === 0 ? (
                <p className="text-sm text-gray-500 py-2">No other projects available</p>
              ) : (
                <div className="space-y-2">
                  {projects.filter(p => p.id !== task?.projectId).map((project) => (
                    <label key={project.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={(editedTask.teamDependencyIds || []).includes(project.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleChange('teamDependencyIds', [...(editedTask.teamDependencyIds || []), project.id])
                          } else {
                            handleChange('teamDependencyIds', (editedTask.teamDependencyIds || []).filter(id => id !== project.id))
                          }
                        }}
                        disabled={!canEdit}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <span className="text-sm text-gray-700">
                        {project.prefix ? `${project.prefix} – ${project.name}` : project.name}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Card Color</h3>
          <div className="grid grid-cols-4 gap-2 mb-6">
            {getAllColors().map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => handleChange('color', color)}
                disabled={!canEdit}
                className={`relative p-3 rounded-lg border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  editedTask.color === color
                    ? `${CARD_COLORS[color].border} ring-2 ring-offset-2 ring-blue-500`
                    : `${CARD_COLORS[color].border}`
                } ${CARD_COLORS[color].bg}`}
              >
                <div className={`w-3 h-3 rounded-full mx-auto ${CARD_COLORS[color].dot}`} />
                <span className="text-xs text-gray-700 mt-1 block">{CARD_COLORS[color].label}</span>
                {editedTask.color === color && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-lg">✓</span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button 
            onClick={() => setShowDeleteConfirm(true)}
            disabled={!canEdit}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Delete
          </button>
          
          <div className="flex space-x-3">
            <button 
              onClick={onClose} 
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Close
            </button>
            {canEdit && (
              <button 
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Save Changes
              </button>
            )}
          </div>
        </div>

        {/* Delete Confirmation Dialog */}
        {showDeleteConfirm && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]"
            onClick={() => setShowDeleteConfirm(false)}
          >
            <div 
              className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Delete Task?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete this task? This action cannot be undone.
              </p>
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={isDeleting}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
