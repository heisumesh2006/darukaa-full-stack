import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react'
import type { ReactNode } from 'react'
import { currentUserRequest, loginRequest, registerRequest } from './api'
import { AuthContext } from './AuthContext'
import { authErrorMessage } from './errors'
import {
  getAccessToken,
  setAccessToken,
  subscribeToSession,
  tokenExpiresAt,
} from './session'
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from './types'

export function AuthProvider({ children }: { children: ReactNode }) {
  const token = useSyncExternalStore(
    subscribeToSession,
    getAccessToken,
    () => null,
  )
  const [resolved, setResolved] = useState<{
    token: string
    user: AuthUser
  } | null>(null)
  const [failure, setFailure] = useState<{
    token: string
    message: string
  } | null>(null)
  const [attempt, setAttempt] = useState(0)
  const operation = useRef(0)
  const user = token && resolved?.token === token ? resolved.user : null
  const sessionError =
    token && failure?.token === token ? failure.message : null

  const logout = useCallback(() => {
    operation.current += 1
    setAccessToken(null)
    setResolved(null)
    setFailure(null)
  }, [])

  useEffect(() => {
    if (!token || user) return
    const controller = new AbortController()
    currentUserRequest(controller.signal)
      .then((currentUser) => {
        if (!controller.signal.aborted && getAccessToken() === token) {
          setResolved({ token, user: currentUser })
          setFailure(null)
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted && getAccessToken() === token) {
          setFailure({ token, message: authErrorMessage(error) })
        }
      })
    return () => controller.abort()
  }, [token, user, attempt])

  useEffect(() => {
    if (!token) return
    const expiration = tokenExpiresAt(token)
    if (expiration === null) return
    const timer = window.setTimeout(
      logout,
      Math.max(0, expiration - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [token, logout])

  const authenticate = useCallback(
    async (request: () => Promise<AuthResponse>) => {
      const sequence = ++operation.current
      const result = await request()
      if (sequence !== operation.current) return
      setFailure(null)
      setResolved({ token: result.access_token, user: result.user })
      setAccessToken(result.access_token)
    },
    [],
  )
  const login = useCallback(
    (input: LoginInput) => authenticate(() => loginRequest(input)),
    [authenticate],
  )
  const register = useCallback(
    (input: RegisterInput) => authenticate(() => registerRequest(input)),
    [authenticate],
  )

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isLoading: Boolean(token && !user && !sessionError),
        sessionError,
        login,
        register,
        logout,
        retrySession: () => {
          setFailure(null)
          setAttempt((value) => value + 1)
        },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}
