'use client'

import { useState } from 'react'
import { WorkspaceInfo, WorkspaceSetting } from '@/types/settings'
import { Settings, Save, X, Edit2 } from 'lucide-react'

interface WorkspaceSettingsProps {
  workspace: WorkspaceInfo
  settings: WorkspaceSetting[]
  onSettingChange?: (id: string, value: string | boolean | number) => void
}

export default function WorkspaceSettings({
  workspace,
  settings,
  onSettingChange,
}: WorkspaceSettingsProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string | boolean | number>>({})

  const handleEdit = (setting: WorkspaceSetting) => {
    setEditingId(setting.id)
    setEditValues({ [setting.id]: setting.value })
  }

  const handleSave = (id: string) => {
    const value = editValues[id]
    if (value !== undefined) {
      onSettingChange?.(id, value)
      setEditingId(null)
    }
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditValues({})
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6" />
          Workspace Settings
        </h2>
        <p className="text-sm text-gray-600 mt-1">Manage your workspace configuration</p>
      </div>

      {/* Workspace Info */}
      <div className="p-6 border-b border-gray-200 bg-blue-50">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Workspace Name</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{workspace.name}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Owner</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{workspace.owner}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Members</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{workspace.memberCount}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 uppercase">Projects</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{workspace.projectCount}</p>
          </div>
        </div>
        {workspace.description && (
          <p className="text-sm text-gray-700 mt-4">{workspace.description}</p>
        )}
      </div>

      {/* Settings List */}
      <div className="divide-y divide-gray-200">
        {settings.map((setting) => {
          const isEditing = editingId === setting.id
          const currentValue = editValues[setting.id] ?? setting.value

          return (
            <div key={setting.id} className="p-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-gray-900">{setting.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{setting.description}</p>
                </div>

                {isEditing ? (
                  <div className="flex items-center gap-2 ml-4">
                    {setting.type === 'boolean' ? (
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={currentValue as boolean}
                          onChange={(e) =>
                            setEditValues({ ...editValues, [setting.id]: e.target.checked })
                          }
                          className="w-5 h-5 text-blue-600 rounded"
                        />
                      </label>
                    ) : setting.type === 'select' && setting.options ? (
                      <select
                        value={String(currentValue)}
                        onChange={(e) =>
                          setEditValues({ ...editValues, [setting.id]: e.target.value })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {setting.options.map((opt) => (
                          <option key={String(opt.value)} value={String(opt.value)}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={setting.type === 'number' ? 'number' : 'text'}
                        value={String(currentValue)}
                        onChange={(e) =>
                          setEditValues({
                            ...editValues,
                            [setting.id]:
                              setting.type === 'number' ? parseFloat(e.target.value) : e.target.value,
                          })
                        }
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                    <button
                      onClick={() => handleSave(setting.id)}
                      className="text-green-600 hover:text-green-700 transition-colors p-2"
                    >
                      <Save className="w-5 h-5" />
                    </button>
                    <button
                      onClick={handleCancel}
                      className="text-red-600 hover:text-red-700 transition-colors p-2"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-4 ml-4">
                    <span className="text-sm font-medium text-gray-900">
                      {setting.type === 'boolean'
                        ? currentValue
                          ? '✓ Enabled'
                          : '✗ Disabled'
                        : currentValue}
                    </span>
                    {setting.editable && (
                      <button
                        onClick={() => handleEdit(setting)}
                        className="text-blue-600 hover:text-blue-700 transition-colors p-2"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
