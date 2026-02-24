'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Team } from '@/types/team'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import TeamsList from '@/components/TeamsList'
import MemberManagement from '@/components/MemberManagement'
import RoleAssignment from '@/components/RoleAssignment'
import { useAuth } from '@/context/AuthContext'

export default function TeamsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [teams, setTeams] = useState<Team[]>([])
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    // TODO: Fetch teams from API
    const mockTeams: Team[] = [
      {
        id: '1',
        name: 'Development Team',
        description: 'ทีมพัฒนาซอฟต์แวร์',
        owner: 'user@example.com',
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-10'),
        members: [
          {
            id: 'm1',
            email: 'john@example.com',
            name: 'John Doe',
            role: 'admin',
            joinedAt: new Date('2025-01-01'),
          },
          {
            id: 'm2',
            email: 'jane@example.com',
            name: 'Jane Smith',
            role: 'member',
            joinedAt: new Date('2025-01-05'),
          },
          {
            id: 'm3',
            email: 'bob@example.com',
            name: 'Bob Johnson',
            role: 'member',
            joinedAt: new Date('2025-01-08'),
          },
        ],
      },
      {
        id: '2',
        name: 'Design Team',
        description: 'ทีมออกแบบ',
        owner: 'user@example.com',
        createdAt: new Date('2025-01-02'),
        updatedAt: new Date('2025-01-09'),
        members: [
          {
            id: 'd1',
            email: 'alice@example.com',
            name: 'Alice Brown',
            role: 'manager',
            joinedAt: new Date('2025-01-02'),
          },
          {
            id: 'd2',
            email: 'carol@example.com',
            name: 'Carol White',
            role: 'member',
            joinedAt: new Date('2025-01-07'),
          },
        ],
      },
      {
        id: '3',
        name: 'Marketing Team',
        description: 'ทีมการตลาด',
        owner: 'user@example.com',
        createdAt: new Date('2025-01-03'),
        updatedAt: new Date('2025-01-11'),
        members: [
          {
            id: 'mk1',
            email: 'david@example.com',
            name: 'David Lee',
            role: 'manager',
            joinedAt: new Date('2025-01-03'),
          },
        ],
      },
    ]

    // Simulate API call
    const timer = setTimeout(() => {
      setTeams(mockTeams)
      setSelectedTeam(mockTeams[0])
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [authLoading, isAuthenticated, router])

  const handleRefresh = () => {
    // TODO: Implement refresh logic
    console.log('Refreshing teams...')
  }

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
              <h1 className="text-3xl font-bold text-gray-900">Teams</h1>
              <p className="text-gray-600 mt-2">จัดการทีมและสมาชิก</p>
            </div>

            {/* Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Teams List */}
              <div className="lg:col-span-1">
                <TeamsList
                  teams={teams}
                  selectedTeam={selectedTeam}
                  onSelectTeam={setSelectedTeam}
                />
              </div>

              {/* Management Section */}
              <div className="lg:col-span-2 space-y-6">
                {/* Member Management */}
                <MemberManagement team={selectedTeam} onMemberAdded={handleRefresh} />

                {/* Role Assignment */}
                <RoleAssignment team={selectedTeam} onRoleChanged={handleRefresh} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
