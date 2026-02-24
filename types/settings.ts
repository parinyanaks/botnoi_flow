export interface WorkspaceSetting {
  id: string
  name: string
  description: string
  value: string | boolean | number
  type: 'text' | 'boolean' | 'select' | 'number'
  options?: { label: string; value: string | boolean | number }[]
  editable: boolean
}

export interface WorkspaceInfo {
  id: string
  name: string
  description?: string
  owner: string
  createdAt: Date
  updatedAt: Date
  memberCount: number
  projectCount: number
}

export interface GlobalRole {
  id: string
  name: string
  description: string
  permissions: Permission[]
  userCount: number
  isSystem: boolean
}

export interface Permission {
  id: string
  name: string
  description: string
  category: 'workspace' | 'projects' | 'teams' | 'reports'
}

export interface RoleUser {
  id: string
  email: string
  name: string
  role: string
  joinedAt: Date
}
