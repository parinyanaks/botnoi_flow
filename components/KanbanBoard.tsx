import { Task, Column, CardStatus } from '@/types/card'
import TaskCard from './TaskCard'
import { MoreVertical, Plus, Filter } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import React from 'react'

interface KanbanBoardProps {
  tasks: Task[]
  onTaskClick: (task: Task) => void
  onTaskStatusChange: (taskId: string, newStatus: CardStatus) => void
  filter: string
  setFilter: (filter: string) => void
  onCreateTaskClick: () => void
}

const columns: Column[] = [
  { id: 'backlog', title: 'Backlog', color: 'bg-gray-200' },
  { id: 'todo', title: 'To Do', color: 'bg-blue-200' },
  { id: 'inprogress', title: 'In Progress', color: 'bg-yellow-200' },
  { id: 'done', title: 'Done', color: 'bg-green-200' }
]

export default function KanbanBoard({ tasks, onTaskClick, onTaskStatusChange, filter, setFilter, onCreateTaskClick }: KanbanBoardProps) {
  const { user } = useAuth()
  const isGuest = user?.role === 'guest'
  const canMoveCards = !isGuest
  const [dragOverColumn, setDragOverColumn] = React.useState<string | null>(null)
  
  // ✅ FIX 1: ใช้ ref เก็บ taskId แทน dataTransfer เพราะ React synthetic events อาจอ่านค่าไม่ได้ใน onDrop
  const draggedTaskId = React.useRef<string | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    if (!canMoveCards) return
    e.preventDefault()
    // ✅ FIX 2: ลบ stopPropagation() ออก เพราะมันขัดขวาง event bubbling ของ drop zone
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDragEnter = (e: React.DragEvent, columnId: string) => {
    if (!canMoveCards) return
    e.preventDefault()
    setDragOverColumn(columnId)
  }

  const handleDragLeave = (e: React.DragEvent, columnId: string) => {
    if (!canMoveCards) return
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverColumn((prev) => (prev === columnId ? null : prev))
    }
  }

  const handleDrop = (e: React.DragEvent, newStatus: CardStatus) => {
    e.preventDefault()
    setDragOverColumn(null)
    if (!canMoveCards) return

    // ✅ FIX 1: อ่านจาก ref แทน dataTransfer
    const taskId = draggedTaskId.current
    if (taskId === null) {
      console.error('No dragged task ID found')
      return
    }
    
    console.log('Dropping task', taskId, 'to column', newStatus)
    onTaskStatusChange(taskId, newStatus)
    draggedTaskId.current = null
  }

  return (
    <main className="flex-1 overflow-x-auto bg-gray-50 p-6">
      <div className="mb-6 flex items-center justify-end gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-gray-700">
            <Filter className="w-4 h-4" />
            <span className="text-sm font-semibold">Priority:</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('high')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'high'
                  ? 'bg-red-600 text-white border-red-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
              }`}
            >
              High
            </button>
            <button
              onClick={() => setFilter('medium')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'medium'
                  ? 'bg-yellow-500 text-white border-yellow-500 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'
              }`}
            >
              Medium
            </button>
            <button
              onClick={() => setFilter('low')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold border-2 transition-all duration-200 ${
                filter === 'low'
                  ? 'bg-green-600 text-white border-green-600 shadow-md'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'
              }`}
            >
              Low
            </button>
          </div>
        </div>
      </div>

      <div className="flex space-x-4 h-full">
        {columns.map((column) => {
          const columnTasks = tasks.filter(task => task.status === column.id)
          const isBacklogColumn = column.id === 'backlog'
          
          return (
            <div key={column.id} className="flex-1 min-w-[320px]">
              <div className="bg-gray-100 rounded-t-lg px-4 py-3 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">
                    {column.title}
                  </h3>
                  <span className="bg-gray-300 text-gray-700 text-xs font-medium px-2 py-0.5 rounded-full">
                    {columnTasks.length}
                  </span>
                </div>
                <button className="text-gray-500 hover:text-gray-700">
                  <MoreVertical className="w-5 h-5" />
                </button>
              </div>
              
              <div 
                className={`rounded-b-lg p-4 min-h-[500px] transition-all duration-200 ${
                  dragOverColumn === column.id
                    ? 'bg-blue-100 border-2 border-blue-400 shadow-lg'
                    : 'bg-gray-50 border-2 border-transparent'
                }`}
                onDragOver={handleDragOver}
                onDragEnter={(e) => handleDragEnter(e, column.id)}
                onDragLeave={(e) => handleDragLeave(e, column.id)}
                onDrop={(e) => handleDrop(e, column.id)}
              >
                {columnTasks.map(task => (
                  <TaskCard 
                    key={task.id} 
                    task={task} 
                    onClick={() => onTaskClick(task)}
                    draggableEnabled={canMoveCards}
                    // ✅ FIX 1: ส่ง callback เพื่อให้ TaskCard บอก KanbanBoard ว่ากำลังลาก task ไหน
                    onDragStart={(taskId) => { draggedTaskId.current = taskId }}
                  />
                ))}
                
                {columnTasks.length === 0 && !isBacklogColumn && (
                  <div className="text-center text-gray-400 py-8">
                    <p className="text-sm">No tasks</p>
                  </div>
                )}

                {isBacklogColumn && (
                  <button
                    onClick={isGuest ? undefined : onCreateTaskClick}
                    disabled={isGuest}
                    className="w-full px-4 py-3 mt-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 font-semibold transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-5 h-5" />
                    Add Task
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </main>
  )
}
