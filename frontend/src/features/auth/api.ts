import { api } from '../../services/api'
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from './types'

export async function loginRequest(input: LoginInput) {
  return (await api.post<AuthResponse>('/auth/login', input)).data
}
export async function registerRequest(input: RegisterInput) {
  return (await api.post<AuthResponse>('/auth/register', input)).data
}
export async function currentUserRequest(signal?: AbortSignal) {
  return (await api.get<AuthUser>('/auth/me', { signal })).data
}
