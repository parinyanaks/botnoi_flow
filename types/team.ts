export type UserRole = 'admin' | 'manager' | 'member' | 'viewer'

export interface TeamMember {
  id: string
  email: string
  name: string
  role: UserRole
  joinedAt: Date
  avatar?: string
}

export interface Team {
  id: string
  name: string
  description?: string
  members: TeamMember[]
  createdAt: Date
  updatedAt: Date
  owner: string
}

export interface TeamInvitation {
  id: string
  teamId: string
  email: string
  role: UserRole
  invitedAt: Date
  expiresAt: Date
}
