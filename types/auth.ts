export type UserRole = 'member' | 'guest'

export interface User {
  id: number
  email: string
  name: string
  role: UserRole
  createdAt?: Date
}

export interface AuthResponse {
  user: User
  token: string
}

export interface LoginDto {
  email: string
  password: string
}

export interface RegisterDto {
  email: string
  name: string
  password: string
  confirmPassword: string
}

export interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
}
