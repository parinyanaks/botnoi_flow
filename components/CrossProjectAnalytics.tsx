'use client'

import { AnalyticsData } from '@/types/reports'
import { TrendingUp, Target, CheckCircle2, BarChart3 } from 'lucide-react'

interface CrossProjectAnalyticsProps {
  data: AnalyticsData
}

export default function CrossProjectAnalytics({ data }: CrossProjectAnalyticsProps) {
  const stats = [
    {
      label: 'Total Projects',
      value: data.totalProjects,
      icon: Target,
      color: 'bg-blue-50 text-blue-600',
      iconBg: 'bg-blue-100',
    },
    {
      label: 'Total Tasks',
      value: data.totalTasks,
      icon: BarChart3,
      color: 'bg-purple-50 text-purple-600',
      iconBg: 'bg-purple-100',
    },
    {
      label: 'Completed Tasks',
      value: data.completedTasks,
      icon: CheckCircle2,
      color: 'bg-green-50 text-green-600',
      iconBg: 'bg-green-100',
    },
    {
      label: 'Average Velocity',
      value: data.averageVelocity.toFixed(1),
      suffix: 'tasks/week',
      icon: TrendingUp,
      color: 'bg-orange-50 text-orange-600',
      iconBg: 'bg-orange-100',
    },
  ]

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">Cross-project Analytics</h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => {
          const Icon = stat.icon
          return (
            <div
              key={index}
              className={`${stat.color} rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`${stat.iconBg} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
              <p className="text-gray-600 text-sm font-medium">{stat.label}</p>
              <p className="text-3xl font-bold mt-2">
                {stat.value}
                {stat.suffix && <span className="text-lg ml-1">{stat.suffix}</span>}
              </p>
            </div>
          )
        })}
      </div>

      {/* Overall Completion Percentage */}
      <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">Overall Completion Rate</h3>
          <span className="text-3xl font-bold text-blue-600">
            {data.overallCompletionPercentage.toFixed(1)}%
          </span>
        </div>
        <div className="w-full bg-white rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${data.overallCompletionPercentage}%` }}
          />
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {data.completedTasks} out of {data.totalTasks} tasks completed
        </p>
      </div>
    </div>
  )
}
