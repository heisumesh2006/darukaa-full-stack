import axios from 'axios'

export function projectError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return 'Unable to reach the server. Please try again.'
    if (error.response.status === 404)
      return 'This project is unavailable or you do not have access.'
    if (error.response.status === 401)
      return 'Your session has expired. Please sign in again.'
    if (error.response.status === 422)
      return 'Check your project name (1–200 characters), description (up to 5,000 characters), and status.'
  }
  return 'Unable to complete the project request. Please try again.'
}
