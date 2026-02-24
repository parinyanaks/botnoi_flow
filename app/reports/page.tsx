'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import CrossProjectAnalytics from '@/components/CrossProjectAnalytics'
import ProgressSummary from '@/components/ProgressSummary'
import VelocityChart from '@/components/VelocityChart'
import { AnalyticsData } from '@/types/reports'
import { useAuth } from '@/context/AuthContext'

export default function ReportsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    // TODO: Fetch analytics data from API
    const mockData: AnalyticsData = {
      totalProjects: 5,
      totalTasks: 156,
      completedTasks: 98,
      averageVelocity: 7.2,
      overallCompletionPercentage: (98 / 156) * 100,
      projectProgress: [
        {
          projectId: 1,
          projectName: 'Website Redesign',
          totalTasks: 45,
          completedTasks: 38,
          inProgressTasks: 5,
          todoTasks: 2,
          completionPercentage: (38 / 45) * 100,
          velocity: 8.5,
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-02-15'),
        },
        {
          projectId: 2,
          projectName: 'Mobile App v2.0',
          totalTasks: 62,
          completedTasks: 35,
          inProgressTasks: 18,
          todoTasks: 9,
          completionPercentage: (35 / 62) * 100,
          velocity: 6.8,
          startDate: new Date('2024-12-15'),
        },
        {
          projectId: 3,
          projectName: 'API Optimization',
          totalTasks: 28,
          completedTasks: 18,
          inProgressTasks: 8,
          todoTasks: 2,
          completionPercentage: (18 / 28) * 100,
          velocity: 7.2,
          startDate: new Date('2025-01-10'),
        },
        {
          projectId: 4,
          projectName: 'Dashboard Integration',
          totalTasks: 21,
          completedTasks: 7,
          inProgressTasks: 10,
          todoTasks: 4,
          completionPercentage: (7 / 21) * 100,
          velocity: 5.5,
          startDate: new Date('2025-01-25'),
        },
      ],
      sprintData: [
        {
          sprintNumber: 1,
          week: 'Week 1',
          tasksCompleted: 12,
          plannedTasks: 15,
          velocity: 12,
        },
        {
          sprintNumber: 2,
          week: 'Week 2',
          tasksCompleted: 14,
          plannedTasks: 15,
          velocity: 14,
        },
        {
          sprintNumber: 3,
          week: 'Week 3',
          tasksCompleted: 11,
          plannedTasks: 15,
          velocity: 11,
        },
        {
          sprintNumber: 4,
          week: 'Week 4',
          tasksCompleted: 18,
          plannedTasks: 20,
          velocity: 18,
        },
        {
          sprintNumber: 5,
          week: 'Week 5',
          tasksCompleted: 15,
          plannedTasks: 18,
          velocity: 15,
        },
        {
          sprintNumber: 6,
          week: 'Week 6',
          tasksCompleted: 16,
          plannedTasks: 18,
          velocity: 16,
        },
        {
          sprintNumber: 7,
          week: 'Week 7',
          tasksCompleted: 12,
          plannedTasks: 15,
          velocity: 12,
        },
      ],
    }

    // Simulate API call
    const timer = setTimeout(() => {
      setAnalyticsData(mockData)
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [authLoading, isAuthenticated, router])

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">กำลังโหลด...</p>
        </div>
      </div>
    )
  }

  if (!analyticsData) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <p className="text-gray-600">ไม่สามารถโหลดข้อมูลได้</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={true} setSidebarOpen={() => {}} />

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-7xl mx-auto px-6 py-8">
            {/* Page Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Reports</h1>
              <p className="text-gray-600 mt-2">Cross-project analytics and performance metrics</p>
            </div>

            {/* Reports Content */}
            <div className="space-y-6">
              {/* Cross-Project Analytics */}
              <CrossProjectAnalytics data={analyticsData} />

              {/* Velocity Chart */}
              <VelocityChart data={analyticsData.sprintData} />

              {/* Progress Summary */}
              <ProgressSummary projects={analyticsData.projectProgress} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
