// Per-tab persistence. No tokens or user details are stored anywhere else.
const storageKey = 'darukaa.accessToken'
const listeners = new Set<() => void>()

function readStoredToken(): string | null {
  try {
    return window.sessionStorage.getItem(storageKey)
  } catch {
    return null
  }
}

let token = readStoredToken()
export const getAccessToken = () => token
export function setAccessToken(value: string | null) {
  token = value
  try {
    if (value) window.sessionStorage.setItem(storageKey, value)
    else window.sessionStorage.removeItem(storageKey)
  } catch {
    /* Memory-only sessions still work when browser storage is disabled. */
  }
  listeners.forEach((listener) => listener())
}

export function subscribeToSession(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function tokenExpiresAt(value: string): number | null {
  try {
    const payload = JSON.parse(
      atob(value.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    )
    return typeof payload.exp === 'number' && Number.isFinite(payload.exp)
      ? payload.exp * 1000
      : null
  } catch {
    return null
  }
}
