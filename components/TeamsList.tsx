'use client'

import { useState } from 'react'
import { Team, TeamMember } from '@/types/team'
import { Plus, Users, Settings } from 'lucide-react'

interface TeamsListProps {
  teams: Team[]
  onSelectTeam: (team: Team) => void
  selectedTeam: Team | null
}

export default function TeamsList({ teams, onSelectTeam, selectedTeam }: TeamsListProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">รายชื่อทีม</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
          <Plus className="w-5 h-5" />
          <span>สร้างทีม</span>
        </button>
      </div>

      <div className="divide-y divide-gray-200">
        {teams.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>ไม่มีทีมใดเลย</p>
          </div>
        ) : (
          teams.map((team) => (
            <div
              key={team.id}
              onClick={() => onSelectTeam(team)}
              className={`p-4 cursor-pointer transition-colors ${
                selectedTeam?.id === team.id
                  ? 'bg-blue-50 border-l-4 border-blue-600'
                  : 'hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{team.name}</h3>
                  {team.description && (
                    <p className="text-sm text-gray-600 mt-1">{team.description}</p>
                  )}
                  <p className="text-xs text-gray-500 mt-2">
                    สมาชิก: {team.members.length}
                  </p>
                </div>
                <Settings className="w-5 h-5 text-gray-400" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
