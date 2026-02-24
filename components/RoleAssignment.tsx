'use client'

import { useState } from 'react'
import { Team, TeamMember, UserRole } from '@/types/team'
import { Shield } from 'lucide-react'

interface RoleAssignmentProps {
  team: Team | null
  onRoleChanged?: () => void
}

const ROLES: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'admin',
    label: 'แอดมิน',
    description: 'ควบคุมทีมทั้งหมด',
  },
  {
    value: 'manager',
    label: 'ผู้จัดการ',
    description: 'จัดการสมาชิกและงาน',
  },
  {
    value: 'member',
    label: 'สมาชิก',
    description: 'ทำงานในทีม',
  },
  {
    value: 'viewer',
    label: 'ผู้ดู',
    description: 'เห็นข้อมูลเท่านั้น',
  },
]

export default function RoleAssignment({ team, onRoleChanged }: RoleAssignmentProps) {
  const [changedMembers, setChangedMembers] = useState<Set<string>>(new Set())

  if (!team) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>เลือกทีมเพื่อจัดการบทบาท</p>
      </div>
    )
  }

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    try {
      // TODO: Call API to update member role
      console.log('Changing role for member', memberId, 'to', newRole)
      setChangedMembers((prev) => new Set(prev).add(memberId))
      onRoleChanged?.()
    } catch (error) {
      console.error('Error changing role:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">Role Assignment</h2>
      </div>

      <div className="p-6">
        {/* Role Information */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {ROLES.map((role) => (
            <div
              key={role.value}
              className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition-colors"
            >
              <h3 className="font-semibold text-gray-900">{role.label}</h3>
              <p className="text-sm text-gray-600 mt-1">{role.description}</p>
            </div>
          ))}
        </div>

        {/* Member Roles */}
        <div className="border-t border-gray-200 pt-6">
          <h3 className="font-semibold text-gray-900 mb-4">จัดการบทบาทสมาชิก</h3>

          {team.members.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <Shield className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>ไม่มีสมาชิกในทีมนี้</p>
            </div>
          ) : (
            <div className="space-y-3">
              {team.members.map((member) => (
                <div
                  key={member.id}
                  className="p-4 border border-gray-200 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900">{member.name}</h4>
                    <p className="text-sm text-gray-600">{member.email}</p>
                  </div>
                  <select
                    value={member.role}
                    onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                    className={`px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors ${
                      changedMembers.has(member.id)
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-300'
                    }`}
                  >
                    {ROLES.map((role) => (
                      <option key={role.value} value={role.value}>
                        {role.label}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
