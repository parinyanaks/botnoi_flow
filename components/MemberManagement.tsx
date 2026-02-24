'use client'

import { useState } from 'react'
import { Team, TeamMember, UserRole } from '@/types/team'
import { Trash2, Mail, Plus } from 'lucide-react'

interface MemberManagementProps {
  team: Team | null
  onMemberAdded?: () => void
  onMemberRemoved?: () => void
}

export default function MemberManagement({
  team,
  onMemberAdded,
  onMemberRemoved,
}: MemberManagementProps) {
  const [isAddingMember, setIsAddingMember] = useState(false)
  const [newMemberEmail, setNewMemberEmail] = useState('')

  if (!team) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-8 text-center text-gray-500">
        <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>เลือกทีมเพื่อจัดการสมาชิก</p>
      </div>
    )
  }

  const handleAddMember = async () => {
    if (!newMemberEmail.trim()) return

    try {
      // TODO: Call API to add member
      console.log('Adding member:', newMemberEmail)
      setNewMemberEmail('')
      setIsAddingMember(false)
      onMemberAdded?.()
    } catch (error) {
      console.error('Error adding member:', error)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('คุณแน่ใจหรือว่าต้องการลบสมาชิกคนนี้?')) return

    try {
      // TODO: Call API to remove member
      console.log('Removing member:', memberId)
      onMemberRemoved?.()
    } catch (error) {
      console.error('Error removing member:', error)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Member Management</h2>
        <button
          onClick={() => setIsAddingMember(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>เพิ่มสมาชิก</span>
        </button>
      </div>

      {isAddingMember && (
        <div className="p-4 bg-blue-50 border-b border-gray-200 flex gap-2">
          <input
            type="email"
            placeholder="อีเมลสมาชิก"
            value={newMemberEmail}
            onChange={(e) => setNewMemberEmail(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddMember()}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddMember}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            เพิ่ม
          </button>
          <button
            onClick={() => setIsAddingMember(false)}
            className="bg-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-400 transition-colors"
          >
            ยกเลิก
          </button>
        </div>
      )}

      <div className="divide-y divide-gray-200">
        {team.members.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Mail className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>ไม่มีสมาชิกในทีมนี้</p>
          </div>
        ) : (
          team.members.map((member) => (
            <div key={member.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-600">{member.email}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    เข้าร่วม: {new Date(member.joinedAt).toLocaleDateString('th-TH')}
                  </p>
                </div>
                <button
                  onClick={() => handleRemoveMember(member.id)}
                  className="text-red-600 hover:text-red-700 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
