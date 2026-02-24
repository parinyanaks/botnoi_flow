'use client'

import React, { createContext, useState, useEffect, ReactNode } from 'react'
import { User, AuthContextType } from '@/types/auth'
import { authService } from '@/services/api'

export const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const userData = await authService.getMe()
        setUser(userData)
      } catch (error) {
        localStorage.removeItem('authToken')
      }
      setIsLoading(false)
    }

    checkAuth()
  }, [])

  const login = async (email: string, password: string) => {
    try {
      const { user: userData, token } = await authService.login(email, password)
      localStorage.setItem('authToken', token)
      if (typeof document !== 'undefined') {
        document.cookie = `authToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
      }
      setUser(userData)
    } catch (error) {
      throw error
    }
  }

  const register = async (email: string, name: string, password: string) => {
    try {
      const { user: userData, token } = await authService.register(email, name, password)
      localStorage.setItem('authToken', token)
      if (typeof document !== 'undefined') {
        document.cookie = `authToken=${token}; path=/; max-age=${60 * 60 * 24 * 7}`
      }
      setUser(userData)
    } catch (error) {
      throw error
    }
  }

  const logout = async () => {
    await authService.logout()
    localStorage.removeItem('authToken')
    if (typeof document !== 'undefined') {
      document.cookie = 'authToken=; path=/; max-age=0'
    }
    setUser(null)
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextType {
  const context = React.useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
