'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/Header'
import Sidebar from '@/components/Sidebar'
import WorkspaceSettings from '@/components/WorkspaceSettings'
import RoleManagement from '@/components/RoleManagement'
import { WorkspaceInfo, WorkspaceSetting, GlobalRole } from '@/types/settings'
import { useAuth } from '@/context/AuthContext'

export default function SettingsPage() {
  const router = useRouter()
  const { isLoading: authLoading, isAuthenticated } = useAuth()
  const [workspaceInfo, setWorkspaceInfo] = useState<WorkspaceInfo | null>(null)
  const [settings, setSettings] = useState<WorkspaceSetting[]>([])
  const [roles, setRoles] = useState<GlobalRole[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!authLoading && !isAuthenticated) {
      router.push('/login')
      return
    }

    // TODO: Fetch settings data from API
    const mockWorkspace: WorkspaceInfo = {
      id: 'ws-1',
      name: 'Botnoi Workspace',
      description: 'Main workspace for project management',
      owner: 'admin@botnoigroup.com',
      createdAt: new Date('2024-12-01'),
      updatedAt: new Date('2025-02-15'),
      memberCount: 25,
      projectCount: 5,
    }

    const mockSettings: WorkspaceSetting[] = [
      {
        id: 'setting-1',
        name: 'Workspace Name',
        description: 'Display name for your workspace',
        value: 'Botnoi Workspace',
        type: 'text',
        editable: true,
      },
      {
        id: 'setting-2',
        name: 'Allow Public Projects',
        description: 'Allow projects to be publicly accessible',
        value: false,
        type: 'boolean',
        editable: true,
      },
      {
        id: 'setting-3',
        name: 'Default Role',
        description: 'Default role for new members',
        value: 'member',
        type: 'select',
        options: [
          { label: 'Admin', value: 'admin' },
          { label: 'Manager', value: 'manager' },
          { label: 'Member', value: 'member' },
          { label: 'Viewer', value: 'viewer' },
        ],
        editable: true,
      },
      {
        id: 'setting-4',
        name: 'Maximum File Upload Size (MB)',
        description: 'Maximum size for file uploads',
        value: 50,
        type: 'number',
        editable: true,
      },
      {
        id: 'setting-5',
        name: 'Enable Email Notifications',
        description: 'Send email notifications to members',
        value: true,
        type: 'boolean',
        editable: true,
      },
      {
        id: 'setting-6',
        name: 'Workspace ID',
        description: 'Unique identifier for your workspace',
        value: 'ws-1',
        type: 'text',
        editable: false,
      },
    ]

    const mockRoles: GlobalRole[] = [
      {
        id: 'role-1',
        name: 'Admin',
        description: 'Full access to all workspace features',
        isSystem: true,
        userCount: 2,
        permissions: [
          {
            id: 'perm-1',
            name: 'Manage Workspace',
            description: 'Access workspace settings and configuration',
            category: 'workspace',
          },
          {
            id: 'perm-2',
            name: 'Manage Users',
            description: 'Add, remove, and manage workspace members',
            category: 'workspace',
          },
          {
            id: 'perm-3',
            name: 'Manage Roles',
            description: 'Create and edit roles and permissions',
            category: 'workspace',
          },
          {
            id: 'perm-4',
            name: 'Create Projects',
            description: 'Create new projects',
            category: 'projects',
          },
          {
            id: 'perm-5',
            name: 'Edit All Projects',
            description: 'Edit any project in the workspace',
            category: 'projects',
          },
          {
            id: 'perm-6',
            name: 'View Reports',
            description: 'View all analytics and reports',
            category: 'reports',
          },
        ],
      },
      {
        id: 'role-2',
        name: 'Manager',
        description: 'Manage projects and team members',
        isSystem: true,
        userCount: 5,
        permissions: [
          {
            id: 'perm-4',
            name: 'Create Projects',
            description: 'Create new projects',
            category: 'projects',
          },
          {
            id: 'perm-7',
            name: 'Edit Own Projects',
            description: 'Edit projects you own',
            category: 'projects',
          },
          {
            id: 'perm-8',
            name: 'Manage Teams',
            description: 'Create and manage teams',
            category: 'teams',
          },
          {
            id: 'perm-9',
            name: 'Assign Members',
            description: 'Assign members to projects',
            category: 'projects',
          },
        ],
      },
      {
        id: 'role-3',
        name: 'Member',
        description: 'Standard team member access',
        isSystem: true,
        userCount: 15,
        permissions: [
          {
            id: 'perm-10',
            name: 'View Projects',
            description: 'View projects assigned to you',
            category: 'projects',
          },
          {
            id: 'perm-11',
            name: 'Edit Tasks',
            description: 'Create and edit tasks',
            category: 'projects',
          },
          {
            id: 'perm-12',
            name: 'View Team',
            description: 'View team information',
            category: 'teams',
          },
        ],
      },
      {
        id: 'role-4',
        name: 'Viewer',
        description: 'Read-only access',
        isSystem: true,
        userCount: 3,
        permissions: [
          {
            id: 'perm-13',
            name: 'View Projects',
            description: 'View projects in read-only mode',
            category: 'projects',
          },
          {
            id: 'perm-14',
            name: 'View Reports',
            description: 'View reports and analytics',
            category: 'reports',
          },
        ],
      },
    ]

    // Simulate API call
    const timer = setTimeout(() => {
      setWorkspaceInfo(mockWorkspace)
      setSettings(mockSettings)
      setRoles(mockRoles)
      setIsLoading(false)
    }, 500)

    return () => clearTimeout(timer)
  }, [authLoading, isAuthenticated, router])

  const handleSettingChange = (id: string, value: string | boolean | number) => {
    setSettings((prev) =>
      prev.map((s) => (s.id === id ? { ...s, value } : s))
    )
    console.log(`Setting ${id} changed to`, value)
    // TODO: Call API to save setting
  }

  const handleRoleChange = (roleId: string, action: 'edit' | 'delete') => {
    console.log(`Role ${roleId} action: ${action}`)
    // TODO: Call API to update role
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

  if (!workspaceInfo) {
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
              <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
              <p className="text-gray-600 mt-2">Manage workspace and role configurations</p>
            </div>

            {/* Settings Content */}
            <div className="space-y-6">
              {/* Workspace Settings */}
              <WorkspaceSettings
                workspace={workspaceInfo}
                settings={settings}
                onSettingChange={handleSettingChange}
              />

              {/* Role Management */}
              <RoleManagement roles={roles} onRoleChange={handleRoleChange} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
