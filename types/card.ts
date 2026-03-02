export type CardStatus = 'backlog' | 'todo' | 'inprogress' | 'done'
export type CardPriority = 'low' | 'medium' | 'high'
export type CardType = 'task' | 'bug' | 'story' | 'design'
export type ImpactLevel = 'high' | 'medium' | 'low'
export type UrgencyLevel = 'high' | 'medium' | 'low'
export type PriorityLevel = 'P0' | 'P1' | 'P2' | 'P3'
export type CardLevel = 'epic' | 'task' | 'bug' | 'story' | 'risk' | 'subtask'
export type CardColor = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'pink' | 'orange' | 'gray'

export interface Card {
  id: string
  title: string
  description: string
  status: CardStatus
  priority: CardPriority
  assignee: string
  type: CardType
  points: number
  projectId?: number | null
  teamDependencyIds?: number[] | null
  reporter?: string
  impact?: ImpactLevel
  urgency?: UrgencyLevel
  priorityLevel?: PriorityLevel
  plannedStartDate?: Date | null
  plannedEndDate?: Date | null
  actualStartDate?: Date | null
  actualEndDate?: Date | null
  plannedEstimatedHours?: number | null
  actualEstimatedHours?: number | null
  labels?: string[]
  cardLevel?: CardLevel
  sprintId?: number | null
  ownerId?: number
  color?: CardColor
  createdAt?: Date
  updatedAt?: Date
}

export type Task = Card

export interface Project {
  id: number
  name: string
  prefix?: string | null
  description?: string | null
  assignee?: string | null
  color?: CardColor
}

export interface Column {
  id: CardStatus
  title: string
  color: string
}
