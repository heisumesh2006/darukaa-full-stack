import { createContext } from 'react'
import type { AuthUser, LoginInput, RegisterInput } from './types'

export interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  isLoading: boolean
  sessionError: string | null
  login: (input: LoginInput) => Promise<void>
  register: (input: RegisterInput) => Promise<void>
  logout: () => void
  retrySession: () => void
}
export const AuthContext = createContext<AuthState | null>(null)
