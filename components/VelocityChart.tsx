'use client'

import { SprintVelocity } from '@/types/reports'
import { TrendingUp } from 'lucide-react'

interface VelocityChartProps {
  data: SprintVelocity[]
}

export default function VelocityChart({ data }: VelocityChartProps) {
  // Find max velocity for scaling
  const maxVelocity = Math.max(...data.map((d) => d.velocity), 1)
  const maxHeight = 300

  // Calculate trend
  const trend =
    data.length >= 2
      ? ((data[data.length - 1].velocity - data[0].velocity) / data[0].velocity) * 100
      : 0

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Team Velocity</h2>
          <p className="text-sm text-gray-600 mt-1">Tasks completed per week</p>
        </div>
        <div className="flex items-center gap-2 text-green-600">
          <TrendingUp className="w-5 h-5" />
          <span className="text-lg font-bold">{trend > 0 ? '+' : ''}{trend.toFixed(1)}%</span>
        </div>
      </div>

      {/* Chart */}
      <div className="flex items-end justify-around gap-2 h-80">
        {data.map((sprint, index) => {
          const heightPercentage = (sprint.velocity / maxVelocity) * 100
          const height = (heightPercentage / 100) * maxHeight

          return (
            <div key={index} className="flex-1 flex flex-col items-center gap-2">
              {/* Bar */}
              <div className="w-full flex flex-col items-center justify-end h-80">
                <div
                  className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t-lg transition-all duration-500 hover:from-blue-600 hover:to-blue-500 cursor-pointer group relative"
                  style={{ height: `${height}px` }}
                >
                  {/* Tooltip */}
                  <div className="opacity-0 group-hover:opacity-100 absolute -top-12 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-3 py-2 rounded-lg whitespace-nowrap text-sm z-10 transition-opacity">
                    <p className="font-bold">{sprint.velocity.toFixed(1)} tasks</p>
                    <p className="text-xs">{sprint.week}</p>
                  </div>
                </div>

                {/* Value Label */}
                <div className="mt-3 text-center">
                  <p className="text-sm font-bold text-gray-900">{sprint.velocity.toFixed(1)}</p>
                  <p className="text-xs text-gray-500 mt-1">{sprint.week}</p>
                </div>
              </div>

              {/* Sprint Number */}
              <div className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                Sprint {sprint.sprintNumber}
              </div>
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <p className="text-sm text-gray-700">
          <span className="font-semibold">Velocity</span> shows how many tasks the team completes
          each week. A steady or increasing velocity indicates good team performance.
        </p>
      </div>

      {/* Statistics */}
      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-medium">Average</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {(data.reduce((sum, d) => sum + d.velocity, 0) / data.length).toFixed(1)}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-medium">Peak</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {Math.max(...data.map((d) => d.velocity)).toFixed(1)}
          </p>
        </div>
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600 font-medium">Latest</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {data[data.length - 1].velocity.toFixed(1)}
          </p>
        </div>
      </div>
    </div>
  )
}
