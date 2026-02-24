'use client'

import { useState } from 'react'
import { GlobalRole, RoleUser, Permission } from '@/types/settings'
import { Shield, Users, Plus, Trash2, Edit2 } from 'lucide-react'

interface RoleManagementProps {
  roles: GlobalRole[]
  onRoleChange?: (roleId: string, action: 'edit' | 'delete') => void
}

export default function RoleManagement({ roles, onRoleChange }: RoleManagementProps) {
  const [selectedRole, setSelectedRole] = useState<GlobalRole | null>(roles[0] || null)
  const [isCreatingRole, setIsCreatingRole] = useState(false)

  const handleDeleteRole = (roleId: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return
    onRoleChange?.(roleId, 'delete')
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Shield className="w-6 h-6" />
          Role Management
        </h2>
        <p className="text-sm text-gray-600 mt-1">Configure roles and permissions</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-200">
        {/* Roles List */}
        <div className="p-6 lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Roles</h3>
            <button
              onClick={() => setIsCreatingRole(true)}
              className="text-blue-600 hover:text-blue-700 transition-colors p-1"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  selectedRole?.id === role.id
                    ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-700'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                <p className="font-medium">{role.name}</p>
                <p className="text-xs text-gray-600 mt-1">
                  {role.userCount} user{role.userCount !== 1 ? 's' : ''}
                </p>
              </button>
            ))}
          </div>

          {isCreatingRole && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <input
                type="text"
                placeholder="Role name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <div className="flex gap-2 mt-3">
                <button className="flex-1 bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm">
                  Create
                </button>
                <button
                  onClick={() => setIsCreatingRole(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-400 transition-colors text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Role Details */}
        {selectedRole && (
          <div className="p-6 lg:col-span-2">
            {/* Basic Info */}
            <div className="mb-6 pb-6 border-b border-gray-200">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{selectedRole.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{selectedRole.description}</p>
                </div>
                <div className="flex gap-2">
                  {!selectedRole.isSystem && (
                    <>
                      <button className="text-blue-600 hover:text-blue-700 transition-colors p-2">
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRole(selectedRole.id)}
                        className="text-red-600 hover:text-red-700 transition-colors p-2"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              {selectedRole.isSystem && (
                <span className="inline-block px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded">
                  System Role
                </span>
              )}
            </div>

            {/* Permissions */}
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-4">Permissions</h4>

              {/* Group by Category */}
              {['workspace', 'projects', 'teams', 'reports'].map((category) => {
                const perms = selectedRole.permissions.filter((p) => p.category === category)
                if (perms.length === 0) return null

                return (
                  <div key={category} className="mb-4">
                    <p className="text-sm font-medium text-gray-700 uppercase mb-2 capitalize">
                      {category}
                    </p>
                    <div className="space-y-2 ml-2">
                      {perms.map((perm) => (
                        <div
                          key={perm.id}
                          className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:bg-gray-100 transition-colors"
                        >
                          <p className="text-sm font-medium text-gray-900">{perm.name}</p>
                          <p className="text-xs text-gray-600 mt-1">{perm.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Users with this Role */}
            <div>
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Users ({selectedRole.userCount})
              </h4>

              {selectedRole.userCount === 0 ? (
                <p className="text-sm text-gray-600 italic">No users assigned to this role</p>
              ) : (
                <div className="space-y-2">
                  {/* Sample users - would be replaced with actual data */}
                  {Array.from({ length: Math.min(selectedRole.userCount, 5) }).map((_, i) => (
                    <div
                      key={i}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">User {i + 1}</p>
                        <p className="text-xs text-gray-600">user{i + 1}@example.com</p>
                      </div>
                      <button className="text-red-600 hover:text-red-700 transition-colors p-2">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
