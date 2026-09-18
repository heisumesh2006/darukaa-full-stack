import axios from 'axios'
import { config } from '../app/config'
import { getAccessToken, setAccessToken } from '../features/auth/session'

export const api = axios.create({
  baseURL: config.apiBaseUrl,
  timeout: 15000,
  headers: { Accept: 'application/json' },
})

api.interceptors.request.use((request) => {
  const base = new URL(config.apiBaseUrl, window.location.origin)
  const target = new URL(api.getUri(request), window.location.origin)
  const prefix = base.pathname.replace(/\/$/, '')
  const belongsToApi =
    target.origin === base.origin &&
    (target.pathname === prefix || target.pathname.startsWith(`${prefix}/`))
  const isCredentialRequest = ['/auth/login', '/auth/register'].some(
    (path) => target.pathname === `${prefix}${path}`,
  )
  request.headers.delete('Authorization')
  const token = getAccessToken()
  if (token && belongsToApi && !isCredentialRequest)
    request.headers.set('Authorization', `Bearer ${token}`)
  return request
})

api.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      const token = getAccessToken()
      // A late failure from an old session must not log out a newer session.
      if (
        token &&
        error.config?.headers.get('Authorization') === `Bearer ${token}`
      )
        setAccessToken(null)
    }
    return Promise.reject(error)
  },
)
