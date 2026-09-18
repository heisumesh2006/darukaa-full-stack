import axios from 'axios'

export function authErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response)
      return 'Unable to reach the server. Check your connection and try again.'
    if (error.response.status === 401)
      return 'The email or password is incorrect, or this account is unavailable.'
    if (error.response.status === 409)
      return 'This email is already registered. Please sign in.'
    if (error.response.status === 422)
      return 'Check your email and password. Registration requires 12–128 characters and a nonblank password.'
    if (error.response.status === 503)
      return 'The service is temporarily unavailable. Please try again.'
  }
  return 'Unable to complete your request. Please try again.'
}
