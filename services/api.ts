import { supabase } from '@/lib/supabaseClient'
import type { Task, Project as CardProject } from '@/types/card'
import { User, AuthResponse, UserRole } from '@/types/auth'
import { normalizeCardColor } from '@/lib/colors'

export type Project = CardProject

export type SprintStatus = 'active' | 'completed' | 'planned'

export interface SprintRecord {
  id: string
  projectId: number
  name: string
  goal?: string | null
  startDate: string
  endDate: string
  duration?: string | null
  capacity?: string | null
  label?: string | null
  status: SprintStatus
  completedAt?: string | null
  actualEndDate?: string | null
}

const mapSupabaseUserToUser = (supabaseUser: any): User => {
  const metadata = supabaseUser.user_metadata || {}
  const email: string = supabaseUser.email || ''
  const defaultRole: UserRole = email.endsWith('@botnoigroup.com') ? 'member' : 'guest'
  const role: UserRole = metadata.role === 'member' || metadata.role === 'guest' ? metadata.role : defaultRole

  return {
    id: 0,
    email,
    name: metadata.name || email,
    role,
    createdAt: supabaseUser.created_at ? new Date(supabaseUser.created_at) : undefined,
  }
}

const mapSprintRowToRecord = (row: any): SprintRecord => {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    goal: row.goal ?? null,
    startDate: row.start_date,
    endDate: row.end_date,
    duration: row.duration ?? null,
    capacity: row.capacity ?? null,
    label: row.label ?? null,
    status: (row.status ?? 'planned') as SprintStatus,
    completedAt: row.completed_at ?? null,
    actualEndDate: row.actual_end_date ?? null,
  }
}

const mapTaskRowToTask = (row: any): Task => {
  // Parse team_dependencies if it's a JSON string or text array
  let teamDependencyIds: number[] | null = null
  if (row.team_dependencies) {
    if (typeof row.team_dependencies === 'string') {
      // Try to parse if it's a JSON string like '["1","3","4"]'
      try {
        const parsed = JSON.parse(row.team_dependencies)
        if (Array.isArray(parsed)) {
          teamDependencyIds = parsed.map((id: any) => {
            const num = parseInt(id, 10)
            return isNaN(num) ? 0 : num
          })
        }
      } catch {
        teamDependencyIds = null
      }
    } else if (Array.isArray(row.team_dependencies)) {
      // Already an array, convert all elements to numbers
      teamDependencyIds = row.team_dependencies.map((id: any) => {
        const num = parseInt(id, 10)
        return isNaN(num) ? 0 : num
      })
    }
  }

  return {
    id: row.id,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    assignee: row.assignee,
    type: row.type,
    points: row.points,
    projectId: row.project_id ?? null,
    teamDependencyIds: teamDependencyIds,
    reporter: row.reporter ?? undefined,
    impact: row.impact ?? undefined,
    urgency: row.urgency ?? undefined,
    priorityLevel: row.priority_level ?? undefined,
    plannedStartDate: row.planned_start_date ? new Date(row.planned_start_date) : null,
    plannedEndDate: row.planned_end_date ? new Date(row.planned_end_date) : null,
    actualStartDate: row.actual_start_date ? new Date(row.actual_start_date) : null,
    actualEndDate: row.actual_end_date ? new Date(row.actual_end_date) : null,
    plannedEstimatedHours: row.planned_estimated_hours ?? null,
    actualEstimatedHours: row.actual_estimated_hours ?? null,
    labels: row.labels ?? undefined,
    cardLevel: row.card_level ?? undefined,
    sprintId: row.sprint_id ?? null,
    ownerId: row.ownerId ?? row.owner_id,
    color: normalizeCardColor(row.color),
    createdAt: row.created_at ? new Date(row.created_at) : undefined,
    updatedAt: row.updated_at ? new Date(row.updated_at) : undefined,
  }
}

const isMissingProjectColorColumnError = (error: any): boolean => {
  const message = `${error?.message ?? ''}`.toLowerCase()
  // Check for various patterns of column not existing error
  const isColumnError = message.includes('column') || message.includes('field') || message.includes('unknown field')
  const hasColor = message.includes('color')
  return hasColor && isColumnError
}

export const authService = {
  register: async (email: string, name: string, password: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role: email.endsWith('@botnoigroup.com') ? 'member' : 'guest',
        },
      },
    })

    if (error) {
      throw error
    }

    if (!data.user || !data.session) {
      throw new Error('Registration failed')
    }

    const user = mapSupabaseUserToUser(data.user)
    const token = data.session.access_token

    return { user, token }
  },

  login: async (email: string, password: string): Promise<AuthResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      throw error
    }

    if (!data.user || !data.session) {
      throw new Error('Login failed')
    }

    const user = mapSupabaseUserToUser(data.user)
    const token = data.session.access_token

    return { user, token }
  },

  validateToken: async (token: string): Promise<User> => {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      throw error
    }

    if (!data.user) {
      throw new Error('User not authenticated')
    }

    return mapSupabaseUserToUser(data.user)
  },

  getMe: async (): Promise<User> => {
    const { data, error } = await supabase.auth.getUser()

    if (error) {
      throw error
    }

    if (!data.user) {
      throw new Error('User not authenticated')
    }

    return mapSupabaseUserToUser(data.user)
  },

  logout: async (): Promise<void> => {
    const { error } = await supabase.auth.signOut()
    if (error) {
      throw error
    }
  }
}

export const projectService = {
  getProjects: async (): Promise<Project[]> => {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      throw error
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      prefix: row.prefix ?? null,
      description: row.description ?? null,
      assignee: row.assignee ?? null,
      color: row.color ? normalizeCardColor(row.color) : undefined,
    })) as Project[]
  },

  createProject: async (input: { name: string; prefix: string; description?: string | null; assignee?: string | null; color?: Project['color'] | null }): Promise<Project> => {
    const insertPayload: any = {
      name: input.name,
      prefix: input.prefix,
      description: input.description ?? null,
      assignee: input.assignee ?? null,
    }
    if (input.color !== undefined) {
      insertPayload.color = input.color
    }

    let { data, error } = await supabase
      .from('projects')
      .insert(insertPayload)
      .select('*')
      .maybeSingle()

    // Backward compatibility: some DBs do not have projects.color yet.
    if (error && input.color !== undefined && isMissingProjectColorColumnError(error)) {
      console.warn('Color column appears to be missing, retrying without color field', error)
      const fallbackPayload = {
        name: input.name,
        prefix: input.prefix,
        description: input.description ?? null,
      }
      const fallbackResult = await supabase
        .from('projects')
        .insert(fallbackPayload)
        .select('*')
        .maybeSingle()
      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error('Project creation failed:', error)
      throw error
    }

    if (!data) {
      throw new Error('Failed to create project')
    }

    return {
      id: (data as any).id,
      name: (data as any).name,
      prefix: (data as any).prefix ?? null,
      description: (data as any).description ?? null,
      assignee: (data as any).assignee ?? null,
      color: (data as any).color ? normalizeCardColor((data as any).color) : undefined,
    } as Project
  },

  updateProject: async (
    id: number | string,
    input: { name?: string; prefix?: string; description?: string | null; assignee?: string | null; color?: Project['color'] | null }
  ): Promise<Project> => {
    const updatePayload: any = {}
    if (input.name !== undefined) updatePayload.name = input.name
    if (input.prefix !== undefined) updatePayload.prefix = input.prefix
    if (input.description !== undefined) updatePayload.description = input.description ?? null
    if (input.assignee !== undefined) updatePayload.assignee = input.assignee
    if (input.color !== undefined) updatePayload.color = input.color

    let { data, error } = await supabase
      .from('projects')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    // Backward compatibility: some DBs do not have projects.color yet.
    if (error && input.color !== undefined && isMissingProjectColorColumnError(error)) {
      console.warn('Color column appears to be missing, retrying without color field', error)
      const fallbackPayload: any = {}
      if (input.name !== undefined) fallbackPayload.name = input.name
      if (input.prefix !== undefined) fallbackPayload.prefix = input.prefix
      if (input.description !== undefined) fallbackPayload.description = input.description ?? null
      if (input.assignee !== undefined) fallbackPayload.assignee = input.assignee
      
      const fallbackResult = await supabase
        .from('projects')
        .update(fallbackPayload)
        .eq('id', id)
        .select('*')
        .maybeSingle()
      data = fallbackResult.data
      error = fallbackResult.error
    }

    if (error) {
      console.error('Project update failed:', error)
      throw error
    }

    if (!data) {
      throw new Error('Failed to update project')
    }

    return {
      id: (data as any).id,
      name: (data as any).name,
      prefix: (data as any).prefix ?? null,
      description: (data as any).description ?? null,
      assignee: (data as any).assignee ?? null,
      color: (data as any).color ? normalizeCardColor((data as any).color) : undefined,
    } as Project
  },

  deleteProject: async (id: number | string): Promise<void> => {
    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
  },
}

export const assigneeService = {
  searchAssignees: async (query: string): Promise<string[]> => {
    // ใช้ query% เพื่อให้ค้นหาเฉพาะชื่อที่ขึ้นต้นด้วยคำที่พิมพ์เท่านั้น
    const pattern = `${query}%`

    // ดึงเฉพาะ Full Name จากตาราง profiles เพียงอย่างเดียวเท่านั้น
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name')
      .ilike('full_name', pattern)

    if (error || !data) {
      return []
    }

    const names: string[] = []
    for (const row of data) {
      if (row.full_name && !row.full_name.includes('@')) {
        names.push(row.full_name)
      }
    }

    return Array.from(new Set(names)).sort()
  },
}

export const sprintService = {
  getSprints: async (projectId: number): Promise<SprintRecord[]> => {
    const { data, error } = await supabase
      .from('sprints')
      .select('*')
      .eq('project_id', projectId)
      .order('start_date', { ascending: true })

    if (error) {
      throw error
    }

    return (data || []).map(mapSprintRowToRecord)
  },

  createSprint: async (input: {
    id?: string
    projectId: number
    name: string
    goal?: string
    startDate: string
    endDate: string
    duration: string
    capacity?: string
    label?: string
    status: SprintStatus
    completedAt?: string | null
    actualEndDate?: string | null
  }): Promise<SprintRecord> => {
    const insertPayload: any = {
      project_id: input.projectId,
      name: input.name,
      start_date: input.startDate,
      end_date: input.endDate,
      duration: input.duration,
      status: input.status,
    }
    
    // Only include ID if it's a valid UUID (not a temp one) or if we really want to force it.
    // Usually we let Supabase generate it.
    if (input.id && !input.id.startsWith('sprint_')) {
        insertPayload.id = input.id
    }

    if (input.goal !== undefined) insertPayload.goal = input.goal
    if (input.capacity !== undefined) insertPayload.capacity = input.capacity
    if (input.label !== undefined) insertPayload.label = input.label
    if (input.completedAt !== undefined) insertPayload.completed_at = input.completedAt
    if (input.actualEndDate !== undefined) insertPayload.actual_end_date = input.actualEndDate

    const { data, error } = await supabase
      .from('sprints')
      .insert(insertPayload)
      .select('*')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Failed to create sprint')
    }

    return mapSprintRowToRecord(data)
  },

  updateSprint: async (
    id: string,
    input: {
      name?: string
      goal?: string | null
      startDate?: string
      endDate?: string
      duration?: string
      capacity?: string | null
      label?: string | null
      status?: SprintStatus
      completedAt?: string | null
      actualEndDate?: string | null
    }
  ): Promise<SprintRecord> => {
    const updatePayload: any = {}
    if (input.name !== undefined) updatePayload.name = input.name
    if (input.goal !== undefined) updatePayload.goal = input.goal
    if (input.startDate !== undefined) updatePayload.start_date = input.startDate
    if (input.endDate !== undefined) updatePayload.end_date = input.endDate
    if (input.duration !== undefined) updatePayload.duration = input.duration
    if (input.capacity !== undefined) updatePayload.capacity = input.capacity
    if (input.label !== undefined) updatePayload.label = input.label
    if (input.status !== undefined) updatePayload.status = input.status
    if (input.completedAt !== undefined) updatePayload.completed_at = input.completedAt
    if (input.actualEndDate !== undefined) updatePayload.actual_end_date = input.actualEndDate

    const { data, error } = await supabase
      .from('sprints')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Failed to update sprint')
    }

    return mapSprintRowToRecord(data)
  },

  deleteSprint: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('sprints')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
  },
}

export const taskService = {
  getTasks: async (): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      throw error
    }

    return (data || []).map(mapTaskRowToTask)
  },

  getTaskById: async (id: string): Promise<Task> => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Task not found')
    }

    return mapTaskRowToTask(data)
  },

  createTask: async (task: Omit<Task, 'id'>): Promise<Task> => {
    const insertPayload: any = {
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assignee: task.assignee,
      type: task.type,
      points: task.points,
    }

    if (task.projectId !== undefined) {
      insertPayload.project_id = task.projectId
    }

    if (task.teamDependencyIds !== undefined) {
      insertPayload.team_dependencies = task.teamDependencyIds ?? []
    }

    if (task.reporter !== undefined) {
      insertPayload.reporter = task.reporter
    }
    // Impact and Urgency are removed
    // if (task.impact !== undefined) {
    //   insertPayload.impact = task.impact
    // }
    // if (task.urgency !== undefined) {
    //   insertPayload.urgency = task.urgency
    // }
    if (task.priorityLevel !== undefined) {
      insertPayload.priority_level = task.priorityLevel
    }
    if (task.plannedStartDate !== undefined) {
      insertPayload.planned_start_date = task.plannedStartDate
    }
    if (task.plannedEndDate !== undefined) {
      insertPayload.planned_end_date = task.plannedEndDate
    }
    if (task.actualStartDate !== undefined) {
      insertPayload.actual_start_date = task.actualStartDate
    }
    if (task.actualEndDate !== undefined) {
      insertPayload.actual_end_date = task.actualEndDate
    }
    if (task.plannedEstimatedHours !== undefined) {
      insertPayload.planned_estimated_hours = task.plannedEstimatedHours
    }
    if (task.actualEstimatedHours !== undefined) {
      insertPayload.actual_estimated_hours = task.actualEstimatedHours
    }
    if (task.labels !== undefined) {
      insertPayload.labels = task.labels
    }
    if (task.cardLevel !== undefined) {
      insertPayload.card_level = task.cardLevel
    }
    if (task.sprintId !== undefined) {
      insertPayload.sprint_id = task.sprintId
    }
    if (task.ownerId !== undefined) {
      insertPayload.owner_id = task.ownerId
    }
    // Color removed
    // if (task.color !== undefined) {
    //   insertPayload.color = task.color
    // }

    const { data, error } = await supabase
      .from('cards')
      .insert(insertPayload)
      .select('*')
      .maybeSingle()

    if (error) {
      throw error
    }

    if (!data) {
      throw new Error('Failed to create task')
    }

    return mapTaskRowToTask(data)
  },

  updateTask: async (id: string, task: Partial<Task>): Promise<Task> => {
    const updatePayload: any = {}

    if (task.title !== undefined) updatePayload.title = task.title
    if (task.description !== undefined) updatePayload.description = task.description
    if (task.status !== undefined) updatePayload.status = task.status
    if (task.priority !== undefined) updatePayload.priority = task.priority
    if (task.assignee !== undefined) updatePayload.assignee = task.assignee
    if (task.type !== undefined) updatePayload.type = task.type
    if (task.points !== undefined) updatePayload.points = task.points
    if (task.projectId !== undefined) updatePayload.project_id = task.projectId
    if (task.teamDependencyIds !== undefined) updatePayload.team_dependencies = task.teamDependencyIds ?? []
    if (task.reporter !== undefined) updatePayload.reporter = task.reporter
    // Impact and Urgency are removed
    // if (task.impact !== undefined) updatePayload.impact = task.impact
    // if (task.urgency !== undefined) updatePayload.urgency = task.urgency
    if (task.priorityLevel !== undefined) updatePayload.priority_level = task.priorityLevel
    if (task.plannedStartDate !== undefined) updatePayload.planned_start_date = task.plannedStartDate
    if (task.plannedEndDate !== undefined) updatePayload.planned_end_date = task.plannedEndDate
    if (task.actualStartDate !== undefined) updatePayload.actual_start_date = task.actualStartDate
    if (task.actualEndDate !== undefined) updatePayload.actual_end_date = task.actualEndDate
    if (task.plannedEstimatedHours !== undefined) updatePayload.planned_estimated_hours = task.plannedEstimatedHours
    if (task.actualEstimatedHours !== undefined) updatePayload.actual_estimated_hours = task.actualEstimatedHours
    if (task.labels !== undefined) updatePayload.labels = task.labels
    if (task.cardLevel !== undefined) updatePayload.card_level = task.cardLevel
    if (task.sprintId !== undefined) updatePayload.sprint_id = task.sprintId
    if (task.ownerId !== undefined) updatePayload.owner_id = task.ownerId
    // if (task.color !== undefined) updatePayload.color = task.color

    console.log('[API] updateTask payload:', { taskId: id, updatePayload })

    const { data, error } = await supabase
      .from('cards')
      .update(updatePayload)
      .eq('id', id)
      .select('*')
      .maybeSingle()

    if (error) {
      console.error('[API] updateTask error:', error)
      throw error
    }

    if (!data) {
      throw new Error('Failed to update task')
    }

    console.log('[API] updateTask response:', { 
      taskId: id, 
      teamDependencyIds: data.team_dependencies,
      fullData: data 
    })

    return mapTaskRowToTask(data)
  },

  deleteTask: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('cards')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }
  },

  getTasksByStatus: async (status: string): Promise<Task[]> => {
    const { data, error } = await supabase
      .from('cards')
      .select('*')
      .eq('status', status)
      .order('id', { ascending: true })

    if (error) {
      throw error
    }

    return (data || []).map(mapTaskRowToTask)
  },
}
