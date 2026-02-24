'use client'

import { ProjectProgress } from '@/types/reports'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface ProgressSummaryProps {
  projects: ProjectProgress[]
}

export default function ProgressSummary({ projects }: ProgressSummaryProps) {
  const getStatusColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 text-green-800 border-green-300'
    if (percentage >= 50) return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    return 'bg-red-100 text-red-800 border-red-300'
  }

  const getVelocityTrend = (velocity: number) => {
    return velocity > 5 ? 'positive' : 'negative'
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">Progress Summary</h2>
        <p className="text-sm text-gray-600 mt-1">Detailed breakdown by project</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Project Name
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Progress
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Tasks
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Velocity
              </th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">
                Completion
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {projects.map((project) => {
              const velocityTrend = getVelocityTrend(project.velocity)
              const statusColor = getStatusColor(project.completionPercentage)

              return (
                <tr key={project.projectId} className="hover:bg-gray-50 transition-colors">
                  {/* Project Name */}
                  <td className="px-6 py-4">
                    <div>
                      <p className="font-semibold text-gray-900">{project.projectName}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        Started: {new Date(project.startDate).toLocaleDateString('th-TH')}
                      </p>
                    </div>
                  </td>

                  {/* Progress Bar */}
                  <td className="px-6 py-4">
                    <div className="w-48">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-600">
                          {project.completedTasks}/{project.totalTasks}
                        </span>
                        <span className="text-sm font-medium text-gray-900">
                          {project.completionPercentage.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
                          style={{ width: `${project.completionPercentage}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Task Breakdown */}
                  <td className="px-6 py-4">
                    <div className="text-sm space-y-1">
                      <p className="text-green-600">✓ {project.completedTasks} Done</p>
                      <p className="text-blue-600">→ {project.inProgressTasks} In Progress</p>
                      <p className="text-gray-500">○ {project.todoTasks} To Do</p>
                    </div>
                  </td>

                  {/* Velocity */}
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-semibold text-gray-900">
                        {project.velocity.toFixed(1)}
                      </span>
                      {velocityTrend === 'positive' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-600" />
                      )}
                      <span className="text-xs text-gray-500">tasks/week</span>
                    </div>
                  </td>

                  {/* Completion Status */}
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full border ${statusColor}`}
                    >
                      {project.completionPercentage >= 80 && '🎉'}
                      {project.completionPercentage >= 50 && project.completionPercentage < 80 && '📊'}
                      {project.completionPercentage < 50 && '⏳'}
                      {project.completionPercentage.toFixed(0)}%
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
