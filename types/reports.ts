export interface ProjectProgress {
  projectId: string
  projectName: string
  totalTasks: number
  completedTasks: number
  inProgressTasks: number
  todoTasks: number
  completionPercentage: number
  velocity: number // tasks completed per week
  startDate: Date
  endDate?: Date
}

export interface SprintVelocity {
  sprintNumber: number
  week: string
  tasksCompleted: number
  plannedTasks: number
  velocity: number
}

export interface AnalyticsData {
  totalProjects: number
  totalTasks: number
  completedTasks: number
  averageVelocity: number
  overallCompletionPercentage: number
  projectProgress: ProjectProgress[]
  sprintData: SprintVelocity[]
}
