export interface AuthUser {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
}

export interface LoginInput {
  email: string
  password: string
}
export interface RegisterInput extends LoginInput {
  full_name?: string
}
export interface AuthResponse {
  access_token: string
  token_type: 'bearer'
  expires_in: number
  user: AuthUser
}
