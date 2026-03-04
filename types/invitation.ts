export type InvitationRole = 'member' | 'guest'

export interface Invitation {
  id: string
  name: string
  email: string
  role: InvitationRole
  projectIds: number[] | null
  token: string
  invitedBy: string
  expiresAt: Date
  acceptedAt: Date | null
  createdAt: Date
}

export interface CreateInvitationDto {
  name: string
  email: string
  role: InvitationRole
  projectIds?: number[] // required for guest, omit for member
}

export interface AcceptInvitationDto {
  token: string
  password: string
}
